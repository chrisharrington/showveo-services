import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import * as http from 'http';
import { Server as SocketServer } from 'socket.io';

import Config from '@lib/config';
import { Socket } from '@lib/socket';

import Chat from './chat';
import Webhook from './webhook';
import Movies from './api/movies';
import Shows from './api/shows';
import Devices from './api/devices';
import Auth from './api/auth';
import Cast from './cast';


export default class Server {
    private port: number;

    constructor(port: number) {
        this.port = port;
    }

    run() {
        const app = express(),
            server = http.createServer(app);

        app.use(cors({ origin: 'https://www.showveo.com', credentials: true }));
        // app.use(this.authorize);
        app.use(bodyParser.json());
        app.use(cookieParser()); 
        
        server.listen(this.port, () => console.log(`[api] Listening on port ${this.port}...`));

        new Chat().initialize(app);
        new Webhook().initialize(app);

        const prefix = '/data';
        Movies.initialize(app, prefix);
        Shows.initialize(app, prefix);
        Devices.initialize(app, prefix);
        Auth.initialize(app, prefix);

        Cast.initialize();
        Socket.initialize(new SocketServer(server));
    }

    private authorize(request: express.Request, response: express.Response, next: () => void) {
        const auth = request.headers['authorization'];
        if (auth === Config.serverApiKey || !auth)
            next();
        else
            response.sendStatus(403);
    }
}