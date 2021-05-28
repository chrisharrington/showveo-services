import { Express, Request, Response } from 'express';

import Movies from '@lib/data/movie';
import { Castable } from '@lib/models';

import Cast from '@api/cast';
import Device from '@api/cast/device';

const stringSimilarity = require('string-similarity');

export default class Chat {
    initialize(app: Express) {
        app.post('/webhook', async (request: Request, response: Response) => {
            try {
                const [ deviceName, mediaName ] = this.parseParametersFromQuery(request.body.query);

                const [ movies, devices ] = await Promise.all([
                    Movies.search(mediaName),
                    Cast.devices()
                ]);

                if (movies.length === 0)
                    throw new Error(`No movies with name "${mediaName}" were found.`);

                const sortedDevices = devices
                    .map((device: Device) => ({
                        device,
                        score: stringSimilarity.compareTwoStrings(device.name, deviceName)
                    }))
                    .filter(d => d.score >= 0.5)
                    .sort((first, second) => second.score - first.score);

                const device = sortedDevices.length > 0 ? sortedDevices[0].device : null;
                if (!device)
                    throw new Error(`No devices with name "${deviceName}"  were found.`);

                device.cast(Castable.fromMovie(movies[0]));

                response.sendStatus(200);
            } catch (e) {
                console.error(e);
                response.status(500).send(e);
            }
        });
    }

    private parseParametersFromQuery(query: string) : [string, string] {
        return ['Office Display', 'Chef'];
    }

    private sanitizeDeviceName(value: string) : string {
        return value
            .toLowerCase()
            .replace('the', '')
            .replace('tv', '')
            .trim()
            .split(' ').map(x => x[0].toUpperCase() + x.substring(1)).join(' ');
    }
}