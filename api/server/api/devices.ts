import { Application, Request, Response } from 'express';

import Cast from '@api/server/cast';

import MovieService from '@lib/data/movie';
import EpisodeService from '@lib/data/episode';
import ShowService from '@lib/data/show';
import { Castable, Episode, Movie, Show } from '@lib/models';

import Device from '@api/server/cast/device';
import Middlewares from '@api/server/middlewares';

import Base from './base';

export default class Devices extends Base {
    static initialize(app: Application, prefix: string = '') {
        app.get(prefix + '/devices', Middlewares.auth, this.getDevices.bind(this));

        app.post(prefix + '/devices/cast', Middlewares.auth, this.cast.bind(this));
        app.post(prefix + '/devices/play', Middlewares.auth, this.play.bind(this));
        app.post(prefix + '/devices/pause', Middlewares.auth, this.pause.bind(this));
        app.post(prefix + '/devices/stop', Middlewares.auth, this.stop.bind(this));
        app.post(prefix + '/devices/seek', Middlewares.auth, this.seek.bind(this));
    }

    private static async getDevices(_: Request, response: Response) {
        console.log('[api] Request received: GET /devices');

        try {
            response.status(200).send(await Cast.devices());
        } catch (e) {
            console.error(`[api] Request failed: GET /devices.`);
            console.error(e);
            response.status(500).send(e);
        }
    }

    private static async cast(request: Request, response: Response) {
        const castable = await this.getCastable(request);
        this.sendCommand(request, response, 'cast', (device: Device) => device.cast(castable));
    }

    private static async play(request: Request, response: Response) {
        await this.sendCommand(request, response, 'play', (device: Device) => device.play());
    }

    private static async pause(request: Request, response: Response) {
        await this.sendCommand(request, response, 'pause', (device: Device) => device.pause());
    }

    private static async stop(request: Request, response: Response) {
        await this.sendCommand(request, response, 'stop', (device: Device) => device.stop());
    }

    private static async seek(request: Request, response: Response) {
        await this.sendCommand(request, response, 'seek', (device: Device) => device.seek(request.body.time as number));
    }

    private static async getDevice(host: string) : Promise<Device> {
        const devices = await Cast.devices();
        return devices.find((device: Device) => device.host === host);
    }

    private static async getCastable(request: Request) : Promise<Castable> {
        let castable: Castable,
            body: any = request.body;

        if (body.movieId) {
            const movie: Movie = await MovieService.findById(body.movieId);
            if (!movie)
                throw new Error('No movie found.');
                
            castable = Castable.fromMovie(movie, body.url);
        } else if (body.episodeId) {
            const episode: Episode = await EpisodeService.findById(body.episodeId),
                show: Show = await ShowService.findOne({ name: episode.show });

            if (!episode)
                throw new Error('No episode found.');
            if (!show)
                throw new Error('No show found.');

            castable = Castable.fromEpisode(episode, show, body.url);
        } else
            throw new Error('No castable element found.');

        return castable;
    }

    private static async sendCommand(request: Request, response: Response, route: string, command: (device: Device) => Promise<void>) : Promise<void> {
        try {
            console.log(`[api] Request received: POST /devices/${route}`);

            const device: Device = await this.getDevice(request.body.host);
            if (!device)
                throw new Error(`No device found: ${request.body.host}`);

            await command(device);
            response.sendStatus(200);
        } catch (e) {
            console.log(`[api] Error processing request: POST /devices/${route}`);
            console.error(e);
            response.status(500).send(e);
        }
    }
}