import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

export enum MessageType {
    GetDevicesRequest = 'get-devices-request',
    GetDevicesResponse = 'get-devices-response',

    GetMoviesRequest = 'get-movies-request',
    GetMoviesResponse = 'get-movies-response',

    CastRequest = 'cast-request',
    CastResponse = 'cast-response',

    PauseRequest = 'pause-request',
    PauseResponse = 'pause-response',

    UnpauseRequest = 'unpause-request',
    UnpauseResponse = 'unpause-response',

    SeekRequest = 'seek-request',
    SeekResponse = 'seek-response',

    SubtitlesRequest = 'subtitles-request',
    SubtitlesResponse = 'subtitles-response',

    DeviceStatusRequest = 'device-status-request',
    DeviceStatusResponse = 'device-status-response'
}

export enum MessageResponseStatus {
    Success = 'success',
    Error = 'error'
}

export interface MessageRequest {
    deviceId: string;
}

export class MessageResponse<Payload> {
    status: MessageResponseStatus;
    error: Error | undefined;
    payload: Payload | undefined;

    static success<Payload>(payload?: Payload) : MessageResponse<Payload> {
        const response = new MessageResponse<Payload>();
        response.status = MessageResponseStatus.Success;
        response.payload = payload;
        return response;
    }

    static error<Payload>(error: Error, payload?: any) : MessageResponse<Payload> {
        const response = new MessageResponse<Payload>();
        response.status = MessageResponseStatus.Error;
        response.error = error;
        response.payload = payload;
        return response;
    }
}

export class RemoteSocket {
    private static server: Server;
    private static promise: Promise<Socket>;
    private static socket: Socket | null;
    private static handlers: { [ key: string ] : ((payload: any) => void)[] };

    static async initialize(server: Server, http: HttpServer) : Promise<Socket> {
        this.server = server || this.server;

        return this.promise = new Promise<Socket>(resolve => {
            this.server.on('connection', socket => {

                this.socket = socket;

                let counter = 0;
                Object.keys(this.handlers).forEach((type: MessageType) => {
                    this.handlers[type].forEach((callback: (payload: any) => void) => {
                        socket.on(type, payload => {
                            console.log(`[api] Received \"${type}\" with payload: ${JSON.stringify(payload)}`);
                            callback(payload);
                        });
                        counter++;
                    });
                });

                console.log(`[api] Socket connected. Existing handlers assigned: ${counter}`);

                socket.on('disconnect', (reason: string) => {
                    console.log(`[api] Socket disconnected. Reason: ${reason}`);
                    socket.removeAllListeners();
                 });

                resolve(socket);
            });
        });
    }

    static async on<Payload>(type: MessageType, callback: (payload: Payload) => void) {
        if (!this.handlers) this.handlers = {};
        if (!this.handlers[type]) this.handlers[type] = [];

        this.handlers[type].push(callback);

        if (this.socket && this.socket.connected)
            this.socket.on(type, callback);
    }

    static async emit<Payload>(deviceId: string, type: MessageType, payload: MessageResponse<Payload>) {
        await this.promise;

        console.log(`[api] Emitting \"${type}\" with payload: ${JSON.stringify(payload).substring(0, 50)}`);
        this.server.emit(type, payload);
    }

    static async broadcast<Payload>(type: MessageType, payload: Payload) {
        await this.promise;

        console.log(`[api] Emitting \"${type}\" with payload: ${JSON.stringify(payload).substring(0, 50)}`);
        this.server.emit(type, payload);
    }
}