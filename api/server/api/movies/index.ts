import { Application } from 'express';
import GetMovies from './get';
import PlayMovie from './play';
import GetSubtitles from './subtitles';

export default class Movies {
    public static initialize(app: Application, routePrefix: string) {
        [
            GetMovies,
        ].forEach(handler => handler.initialize());

        [
            PlayMovie,
            GetSubtitles
        ].forEach(handler => handler.initialize(app, routePrefix));
    }
}