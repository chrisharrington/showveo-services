import { Application, Request, Response } from 'express';
import * as fs from 'fs';

import MovieService from '@lib/data/movie';
import { Movie } from '@lib/models';
import { StringExtensions } from '@lib/extensions';

import Video from '@api/server/video';
import Middlewares from '@api/server/middlewares';

export default class Movies {
    static initialize(app: Application, prefix: string = '') {
        app.get(prefix + '/movies/all', Middlewares.auth, this.getMovies.bind(this));
        app.get(prefix + '/movies/:year/:name', Middlewares.auth, this.getMovieByYearAndName.bind(this));

        app.get(prefix + '/movies/play/:year/:name', Middlewares.auth, this.playMovie.bind(this));
        app.get(prefix + '/movies/subtitle/:year/:name', Middlewares.auth, this.getSubtitlesForMovie.bind(this));

        app.post(prefix + '/movies/progress', Middlewares.auth, this.saveProgress.bind(this));
        app.post(prefix + '/movies/stop/:year/:name/:device', Middlewares.auth, this.stop.bind(this));
    }

    private static async getMovies(request: Request, response: Response) {
        console.log('[api] Request received: GET /movies');

        try {
            const skip = parseInt(request.query.skip.toString()),
                count = parseInt(request.query.count.toString());

            let movies = await MovieService.get(isNaN(skip) ? 0 : skip, isNaN(count) ? 0 : count);
            console.log(`[api] Request succeeded. GET /movies. Found ${movies.length} movies.`);
            response.status(200).send(movies.map(this.sanitize));
        } catch (e) {
            console.error(`[api] Request failed: GET /movies.`);
            console.error(e);
            response.status(500).send(e);
        }
    }

    private static async getMovieByYearAndName(request: Request, response: Response) {
        console.log('[api] Request received: GET /movies/:year/:name');
    
        try {
            let movie = await MovieService.getByYearAndName(parseInt(request.params.year), StringExtensions.fromKebabCase(request.params.name));
            console.log(`[api] Request succeeded. GET /movies/:year/:name. Found movie:`, movie.name);
            response.status(200).send(this.sanitize(movie));
        } catch (e) {
            console.error(`[api] Request failed: GET /movies/:year/:name.`);
            console.error(e);
            response.status(500).send(e);
        }
    }

    private static async saveProgress(request: Request, response: Response) {
        console.log('[api] Request received: POST /movies/progress', request.body);

        try {
            let movie: Movie = await MovieService.findById(request.body.id);
            if (!movie) {
                console.error(`[api] Error: no movie found: ${request.body.id}.`);
                response.sendStatus(404);
                return;
            }

            movie.progress = parseInt(request.body.secondsFromStart);
            if (isNaN(movie.progress)) {
                console.error(`[api] Error: invalid progress: ${request.body.secondsFromStart}`);
                response.sendStatus(400);
                return;
            }

            await MovieService.updateOne(movie);
            response.sendStatus(200);
        } catch (e) {
            console.error(`[api] Request failed: POST /movies/progress.`);
            console.error(e);
            response.status(500).send(e);
        }
    }

    private static sanitize(movie: Movie) : Movie {
        delete movie.path;
        return movie;
    }

    private static async playMovie(request: Request, response: Response) {
        console.log('[api] Request received: GET /movies/play/:year/:name', request.params.year, request.params.name, request.headers.range);

        try {
            const movie = await MovieService.getByYearAndName(parseInt(request.params.year), StringExtensions.fromKebabCase(request.params.name));
            if (!movie) {
                console.error(`[api] Movie not found:`, request.params.year, request.params.name);
                response.sendStatus(404); 
            }

            Video.play(request, response, movie.path);
            // Video.stream(request, response, movie.path);
        } catch (e) {
            console.error('[api] Request failed: GET /movies/play/:year/:name');
            console.error(e);
            response.sendStatus(500);
        }
    }

    private static async getSubtitlesForMovie(request: Request, response: Response) {
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

    private static async stop(request: Request, response: Response) {
        console.log(`[api] Request received: GET /movies/stop/:year/:name/:device`, request.params.year, request.params.name, request.params.device);

        try {
            Video.abort();
            response.sendStatus(200);
        } catch (e) {
            console.error(`[api] Request failed: GET /movies/stop/:year/:name/:device`);
            console.error(e);
            response.sendStatus(500);
        }
    }
}