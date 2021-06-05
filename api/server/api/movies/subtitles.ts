import { Application, Request, Response } from 'express';
import * as fs from 'fs';

import Middlewares from '@api/server/middlewares';
import MovieService from '@lib/data/movie';
import { StringExtensions } from '@lib/extensions';


export default class GetSubtitles {
    static initialize(app: Application, routePrefix: string) {
        app.get(routePrefix + '/movies/subtitle/:year/:name', Middlewares.auth, this.subtitles.bind(this));
    }

    private static async subtitles(request: Request, response: Response) {
        console.log(`[api] Request received: GET /movies/subtitle/:year/:name`, request.params.year, request.params.name);

        try {
            const movie = await MovieService.getByYearAndName(parseInt(request.params.year), StringExtensions.fromKebabCase(request.params.name));
            if (!movie) {
                console.error(`[api] Movie not found:`, request.params.year, request.params.name);
                response.sendStatus(404);
            }

            const subtitles = movie.subtitles || movie.path.replace('.mp4', '.vtt');
            if (!subtitles || !fs.existsSync(subtitles))
                response.sendStatus(404);

            response.writeHead(200, {
                'Content-Length': fs.statSync(subtitles).size,
                'Content-Type': 'text/vvt',
            });
            fs.createReadStream(subtitles).pipe(response);
        } catch (e) {
            console.error(`[api] Request failed: GET /movies/subtitle/:year/:name`);
            console.error(e);
            response.sendStatus(500);
        }
    }
}