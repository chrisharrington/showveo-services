import { Application, Request, Response } from 'express';

import Middlewares from '@api/server/middlewares';
import Video from '@api/server/video';
import MovieService from '@lib/data/movie';
import { StringExtensions } from '@lib/extensions';


export default class PlayMovie {
    static initialize(app: Application, routePrefix: string) {
        app.get(routePrefix + '/movies/play/:year/:name', Middlewares.auth, this.play.bind(this));
    }

    private static async play(request: Request, response: Response) {
        console.log('[api] Request received: GET /movies/play/:year/:name', request.params.year, request.params.name, request.headers.range);

        try {
            const movie = await MovieService.getByYearAndName(parseInt(request.params.year), StringExtensions.fromKebabCase(request.params.name));
            if (!movie) {
                console.error(`[api] Movie not found:`, request.params.year, request.params.name);
                response.sendStatus(404); 
            }

            Video.play(request, response, movie.path);
        } catch (e) {
            console.error('[api] Request failed: GET /movies/play/:year/:name');
            console.error(e);
            response.sendStatus(500);
        }
    }
}