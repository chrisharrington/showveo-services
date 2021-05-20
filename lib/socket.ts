import { Server } from 'socket.io';

export class Message {
    name: string;
    payload: any;

    constructor(name: string, payload: any) {
        this.name = name;
        this.payload = payload;
    }
}

export class Socket {
    private static server: Server;

    static initialize(server: Server) {
        this.server = server;
    }

    static broadcast(message: Message) {
        this.server.emit(message.name, message.payload);
    }
}