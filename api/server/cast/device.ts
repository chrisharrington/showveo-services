import { Client, DefaultMediaReceiver } from 'castv2-client';

import { Castable } from '@lib/models';
import { Socket, Message } from '@lib/socket';

interface Application {
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (currentTime: number) => void;
}

interface Status {
    state: CastState;
    elapsed: number;
    duration: number;
}

enum CastState {
    Idle = 'IDLE',
    Paused = 'PAUSED',
    Playing = 'PLAYING',
    Buffering = 'BUFFERING'
}

export default class Device {
    id: string;
    name: string;
    type: string;
    host: string;
    castable: Castable | null;

    static fromRaw(raw: any) : Device {
        const device = new Device();
        device.id = raw.txtRecord.id;
        device.name = raw.txtRecord.fn;
        device.type = raw.txtRecord.md;
        device.host = raw.host;
        return device;
    }

    async cast(castable: Castable) : Promise<void> {
        this.castable = castable;
        
        return new Promise((resolve, reject) => {
            const client = new Client();

            client.on('error', e => {
                console.log('[api] Client emitted error:');
                console.error(e);
            });

            client.connect(this.host, () => {
                client.launch(DefaultMediaReceiver, (error, player) => {
                    if (error)
                        reject(error);
                    else {
                        const message = {
                            contentId: castable.url,
                            contentType: 'video/mp4',
                            streamType: 'BUFFERED',
                            metadata: {
                                type: 0,
                                metadataType: 0,
                                title: castable.name, 
                                images: [
                                    { url: castable.backdrop }
                                ]
                            }
                        };

                        player.on('error', reject);

                        player.on('status', async status => {
                            if (status.playerState === CastState.Idle)
                                this.castable = null;

                            Socket.broadcast(new Message('status', {
                                media: this.castable?.name,
                                state: status.playerState,
                                elapsed: status.currentTime
                            }));
                            
                            console.log(`[api] Device status: ${status.playerState}`);
                        });

                        player.load(message, { autoplay: true }, (error, status) => {

                            if (error) reject(error);
                            else resolve();
                        });
                    }
                });
            });
        });
    }

    async pause() : Promise<void> {
        await this.command((app: Application) => app.pause());
    }

    async play() : Promise<void> {
        await this.command((app: Application) => app.play());
    }

    async stop() : Promise<void> {
        await this.command((app: Application) => app.stop());
    }

    async seek(time: number) : Promise<void> {
        await this.command((app: Application) => app.seek(time));
    }

    async status() : Promise<Status> {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client.connect(this.host, () => {
                client.getSessions((error, sessions) => {
                    if (error)
                        reject(error);

                    client.join(sessions[0], DefaultMediaReceiver, (error, app) => {
                        if (error)
                            reject(error);

                        app.getStatus((error, status) => {
                            if (error)
                                reject(error);

                            resolve({
                                state: status.playerState,
                                elapsed: status.currentTime,
                                duration: status.media.duration
                            });
                        });
                    });
                });
            });
        });
    }

    private async command(command: (app: Application) => void) {
        return new Promise<void>((resolve, reject) => {
            const client = new Client();
            client.connect(this.host, () => {
                client.getSessions((error, sessions) => {
                    if (error)
                        reject(error);

                    client.join(sessions[0], DefaultMediaReceiver, (error, app) => {
                        if (error)
                            reject(error);

                        if (!app.media.currentSession){
                            app.getStatus(() => {
                                command(app);
                            });
                        } else
                            command(app);

                        resolve();                    
                    });
                });
            });
        });
    }
}