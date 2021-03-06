import { Episode } from '@lib/models';

import { Base } from './base';

class EpisodeService extends Base<Episode> {
    constructor() {
        super('episodes', { show : 'text' });
    }

    async get() : Promise<Episode[]> {
        let collection = await this.connect();
        return new Promise<Episode[]>((resolve, reject) => {
            collection.find({}).sort({ number: 1 }).toArray((error, movies) => {
                if (error) reject(error);
                else resolve(movies);
            });
        });
    }
}

export default new EpisodeService();