import { Castable } from '@lib/models';
import { Socket, Message } from '@lib/socket';

interface RemoteDevice {
    play: (args: any, callback: (error: Error) => void) => void;
    pause: (callback: (error: Error) => void) => void;
    resume: (callback: (error: Error) => void) => void;
    stop: (callback: (error: Error) => void) => void;
    seek: (time: number, callback: (error: Error) => void) => void;
    on: (event: 'status', callback: (status: any) => void) => void;
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

export enum DeviceType {
    Chromecast = 'chromecast',
    GoogleHome = 'google-home',
    NestHub = 'hub',
    Other = 'other'
}

export class Device {
    id: string;
    name: string;
    type: DeviceType;
    host: string;
    castable: Castable | null;
    remote: RemoteDevice;

    static fromRaw(remote: any) : Device {
        const device = new Device();

        Object.defineProperty(device, 'remote', {value: 'static', writable: true});

        device.id = remote.name;
        device.name = remote.friendlyName;
        device.host = remote.host;
        device.remote = remote;

        if (remote.name.startsWith('Chromecast'))
            device.type = DeviceType.Chromecast;
        else if (remote.name.startsWith('Google-Nest-Hub'))
            device.type = DeviceType.NestHub;
        else if (remote.name.startsWith('Google-Home'))
            device.type = DeviceType.GoogleHome;
        else
            device.type = DeviceType.Other;

        device.remote.on('status', status => {
            Socket.broadcast(new Message('status', {
                device: device.id,
                media: device.castable?.name,
                state: status.playerState,
                elapsed: status.currentTime
            }));
        });

        return device;
    }

    async cast(castable: Castable) : Promise<void> {
        this.castable = castable;

        return new Promise((resolve, reject) => {
            this.remote.play({
                url: castable.url,
                cover: {
                    title: castable.name,
                    url: castable.backdrop
                },
                subtitles: [
                    {
                        language: 'en-US',
                        url: castable.subtitles,
                        name: 'English'
                    }
                ]
            }, error => {
                if (error) reject(error);
                resolve();
            });
        });
    }

    async pause() : Promise<void> {
        return new Promise((resolve, reject) => {
            this.remote.pause(error => {
                if (error) reject(error);
                resolve();
            });
        });
    }

    async unpause() : Promise<void> {
        return new Promise((resolve, reject) => {
            this.remote.resume(error => {
                if (error) reject(error);
                resolve();
            });
        });
    }

    async stop() : Promise<void> {
        return new Promise((resolve, reject) => {
            this.remote.stop(error => {
                if (error) reject(error);
                resolve();
            });
        });
    }

    async seek(time: number) : Promise<void> {
        return new Promise((resolve, reject) => {
            this.remote.seek(time, error => {
                if (error) reject(error);
                resolve();
            });
        });
    }

    async subtitles(enable: boolean) : Promise<void> {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
}