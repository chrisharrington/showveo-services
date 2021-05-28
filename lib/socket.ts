import { Server } from 'socket.io';

export class Message<TMessage> {
    name: string;
    payload: TMessage;

    constructor(name: string, payload: TMessage) {
        this.name = name;
        this.payload = payload;
    }
}

export class Socket {
    private static server: Server;

    static initialize(server: Server) {
        this.server = server;
    }

    static broadcast<TMessage>(message: Message<TMessage>) {
        this.server.emit(message.name, message.payload);
    }
}