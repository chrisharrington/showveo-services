import getVideoDuration from 'get-video-duration';
import * as fs from 'fs';

import Files from '@lib/files';
import MovieService from '@lib/data/movie';
import { Movie, File, FileState, Status, MessageType, Message } from '@lib/models';
import { Watcher, WatcherEvent } from '@lib/watcher';
import Queue from '@lib/queue';

export class MovieIndexer {
    paths: string[];
    fileManager: Files;
    subtitleQueue: Queue;
    metadataQueue: Queue;
    conversionQueue: Queue;
    
    constructor(subtitleQueue: Queue, metadataQueue: Queue, conversionQueue: Queue, paths: string[]) {
        this.subtitleQueue = subtitleQueue;
        this.metadataQueue = metadataQueue;
        this.conversionQueue = conversionQueue;
        this.paths = paths;
        this.fileManager = new Files((file: File) => file.isVideoFile());
    }

    async run(...files: File[]) : Promise<void> {
        const date = new Date();

        console.log('[movie-indexer] Indexing movies.');

        await this.removeMoviesWithNoFile();

        files = files.length > 0 ? files : [].concat.apply([], await Promise.all(this.paths.map(async library => await this.fileManager.find(library))));
        console.log(`[movie-indexer] Found ${files.length} video file${files.length === 1 ? '' : 's'} in ${(new Date().getTime() - date.getTime())/1000} seconds.`);

        const movies = (await MovieService.get()).reduce((map: any, movie: Movie) => {
            map[movie.name + movie.year] = movie;
            return map;
        }, {})

        for (var i = 0; i < files.length; i++)
            await this.processFile(files[i], movies);

        console.log(`[movie-indexer] Done. Processed ${files.length} movie${files.length === 1 ? '' : 's'}.`);

        const watcher = new Watcher(...this.paths);
        watcher.on(WatcherEvent.Update, async (file: File) => {
            if (file.isVideoFile())
                await this.processFile(file, movies);
        });

        console.log(`[movie-indexer] Watching for file changes...`);
    }
    
    async removeMoviesWithNoFile() {
        const movies = (await MovieService.get()).filter((movie: Movie) => !fs.existsSync(movie.path));
        for (var i = 0; i < movies.length; i++)
            await MovieService.remove(movies[i]);
        console.log(`[movie-indexer] Removed ${movies.length} missing movie${movies.length === 1 ? '' : 's'}.`);
    }

    private async processFile(file: File, movies: any) : Promise<void> {
        try {
            const title = file.path.split('/').slice(-2, -1).join(),
                name = title.split(' ').slice(0, -1).join(' '),
                year = parseInt(title.substring(title.lastIndexOf(' ')+1).replace('(', '').replace(')', ''));

            console.log(`[movie-indexer] Processing ${file.path}.`);

            let movie: Movie = movies[name + year] || await MovieService.findOne({ name, year });
            if (!movie) {
                movie = new Movie(file.path);
                movie.name = name;
                movie.year = year;
                movie.progress = 0;
                movie.runtime = await getVideoDuration(file.path);
                movie.subtitles = null;
                movie.subtitlesStatus = Status.Unprocessed;
                movie.metadataStatus = Status.Unprocessed;
                movie.conversionStatus = Status.Unprocessed;
                await MovieService.insertOne(movie);
            }

            movie.path = file.path;

            if (movie.metadataStatus === Status.Unprocessed) {
                movie.metadataStatus = Status.Queued;
                console.log(`[movie-indexer] Enqueuing metadata request for ${movie}.`);
                this.metadataQueue.send(new Message(movie, MessageType.Movie));
            }

            if (movie.conversionStatus === Status.Unprocessed) {
                movie.conversionStatus = Status.Queued;
                console.log(`[movie-indexer] Enqueuing conversion request for ${movie}.`);
                this.conversionQueue.send(new Message(movie, MessageType.Movie));
            }

            await MovieService.updateOne(movie);
        } catch (e) {
            console.log(`[movie-indexer] Error processing ${file.path}.`);
            console.error(e);
        }
    }
}