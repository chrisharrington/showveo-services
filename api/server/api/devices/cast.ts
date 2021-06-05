import { RemoteSocket, MessageType, MessageResponse, MessageRequest } from '@root/lib/socket';
import CastService from '@api/cast';
import { Device } from '@root/api/cast/device';
import { Castable, Movie } from '@root/lib/models';
import MovieService from '@root/lib/data/movie';


interface CastMessageRequest extends MessageRequest {
    host: string;
    movieId: string;
    episodeId: string;
}

export default class Cast {
    public static initialize() {
        RemoteSocket.on(MessageType.CastRequest, this.run.bind(this));
    }

    private static async run(message: CastMessageRequest) {
        try {
            const castable = await this.getCastable(message),
                devices = await CastService.devices(),
                device = devices.find((d: Device) => d.host === message.host);

            if (!device)
                throw new Error(`No device with ID \"${message.host}\" found.`);

            device.cast(castable);

            RemoteSocket.emit(message.deviceId, MessageType.CastResponse, MessageResponse.success());
        } catch (e) {
            console.log(`[api] ${MessageType.CastRequest} error.`);
            console.error(e);
            RemoteSocket.emit(message.deviceId, MessageType.CastRequest, MessageResponse.error(e));
        }
    }

    private static async getCastable(message: CastMessageRequest) {
        let castable: Castable;

        if (message.movieId) {
            const movie: Movie = await MovieService.findById(message.movieId);
            if (!movie)
                throw new Error('No movie found.');
                
            castable = Castable.fromMovie(movie);
        } else
            throw new Error('No castable element found.');

        return castable;
    }
}