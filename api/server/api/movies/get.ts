import { RemoteSocket, MessageType, MessageResponse, MessageRequest } from '@root/lib/socket';
import MovieService from '@lib/data/movie';
import { Movie } from '@lib/models';


export default class GetMovies {
    public static initialize() {
        RemoteSocket.on(MessageType.GetMoviesRequest, this.run.bind(this));
    }

    private static async run(message: MessageRequest) {
        try {
            const movies = await MovieService.get();
            RemoteSocket.emit(message.deviceId, MessageType.GetMoviesResponse, MessageResponse.success<{ movies: Movie[] }>({ movies }));
        } catch (e) {
            console.log(`[api] ${MessageType.GetMoviesRequest} error.`);
            console.error(e);
            RemoteSocket.emit(message.deviceId, MessageType.GetMoviesResponse, MessageResponse.error(e));
        }
    }
}