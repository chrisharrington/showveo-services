import { WebhookClient } from 'dialogflow-fulfillment';

import Movies from '@lib/data/movie';
import { Castable } from '@lib/models';

import Cast from '@api/cast';
import Device from '@api/cast/device';

import IntentHandler from './base';

const stringSimilarity = require('string-similarity');

export default class WatchIntentHandler extends IntentHandler {
    constructor(client: WebhookClient) {
        super(client);
    }

    async run() {
        const mediaName = this.client.parameters.mediaName,
            deviceName = this.sanitizeDeviceName(this.client.parameters.deviceName);

        const [ movies, devices ] = await Promise.all([
            Movies.search(this.client.parameters.mediaName),
            Cast.devices()
        ]);

        if (movies.length === 0)
            this.client.end(`Sorry, we weren't able to find a movie named "${mediaName}".`);
        else {
            const sortedDevices = devices
                .map((device: Device) => ({
                    device,
                    score: stringSimilarity.compareTwoStrings(device.name, deviceName)
                }))
                .filter(d => d.score >= 0.5)
                .sort((first, second) => second.score - first.score);

            const device = sortedDevices.length > 0 ? sortedDevices[0].device : null;
            if (!device)
                this.client.end(`Sorry, we weren't able to find a device named "${deviceName}".`);
            else {
                device.cast(Castable.fromMovie(movies[0]));
                this.client.end(`Okay. Playing "${movies[0].name}" on the ${device.name.toLowerCase()}.`);
            }
        }
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