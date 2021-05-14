import { Movie } from '@lib/models';

import { Base } from './base';

class MovieService extends Base<Movie> {
    constructor() {
        super('movies', { name: 'text' });
    }

    async get(skip: number = 0, count: number = 0) : Promise<Movie[]> {
        let collection = await this.connect();
        return new Promise<Movie[]>((resolve, reject) => {
            collection
                .find({})
                .skip(skip)
                .limit(count || 100000)
                .sort({ name: 1 })
                .toArray((error, movies) => {
                    if (error) reject(error);
                    else resolve(movies);
                });
        });
    }

    async getByYearAndName(year: number, name: string) : Promise<Movie> {
        let collection = await this.connect();
        return new Promise<Movie>((resolve, reject) => {
            collection.find({ year, $text: { $search: name }}).sort({ name: 1 }).toArray((error, movies) => {
                if (error) reject(error);
                if (movies.length === 0) reject(`No movie found with name ${name} and year ${year}.`);
                else resolve(movies[0]);
            });
        });
    }

    async load(movies: Movie[]) : Promise<Movie[]> {
        let collection = await this.connect();
        return new Promise<Movie[]>((resolve, reject) => {
            collection.bulkWrite(movies.map(m => {
                return {
                    updateOne: {
                        filter: { path: m.path },
                        update: { $set: m },
                        upsert: true
                    }
                }
            }), (error, result) => {
                if (error) return reject(error);

                collection.find({
                    '_id': {
                        $in: Object.keys(result.upsertedIds).map(key => result.upsertedIds[key])
                    }
                }).toArray((e, docs) => {
                    if (e) reject(e);
                    else resolve(docs as Movie[]);
                });
            });
        });
    }
}

export default new MovieService();