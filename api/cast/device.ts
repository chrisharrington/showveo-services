import { Castable } from '@lib/models';
import { MessageResponse, MessageType, RemoteSocket } from '@root/lib/socket';

interface RemoteDevice {
    play: (args: any, callback: (error: Error) => void) => void;
    pause: (callback: (error: Error) => void) => void;
    resume: (callback: (error: Error) => void) => void;
    stop: (callback: (error: Error) => void) => void;
    seek: (increment: number, callback: (error: Error) => void) => void;
    seekTo: (time: number, callback: (error: Error) => void) => void;
    changeSubtitles: (index: number, callback: (error: Error) => void) => void;
    subtitlesOff: (callback: (error: Error) => void) => void;
    on: (event: 'status' | 'finished', callback: (status: any) => void) => void;
}

enum CastState {
    Idle = 'IDLE',
    Paused = 'PAUSED',
    Playing = 'PLAYING',
    Buffering = 'BUFFERING',
    Finished = 'FINISHED'
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
    media: string | null;
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
            // if (status === CastState.Idle)
            //     device.media = null;
            // if (status === CastState.Paused)
            //     setTimeout(() => device.stop(), 5000);

            RemoteSocket.broadcast(MessageType.DeviceStatusResponse, MessageResponse.success({
                device: device.id,
                media: device.media,
                state: status.playerState === CastState.Idle && status.idleReason === 'CANCELLED' ? CastState.Finished : status.playerState,
                elapsed: status.currentTime
            }));
        });

        device.remote.on('finished', () => {
            RemoteSocket.broadcast(MessageType.DeviceStatusResponse, MessageResponse.success({
                device: device.id,
                media: device.media,
                state: CastState.Finished,
                elapsed: 0
            }));
        });

        return device;
    }

    async cast(castable: Castable) : Promise<void> {
        this.media = castable?.name;

        return new Promise((resolve, reject) => {
            const options = {
                url : castable.url,
                subtitles: [
                    {
                        language: 'en-US',
                        url: castable.subtitles,
                        name: 'English'
                    }
                ],
                cover: {
                    title: castable.name,
                    url: castable.backdrop
                }
            };

            this.remote.play(options, error => {
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
            console.log(time);
            this.remote.seek(time, error => {
                if (error) reject(error);
                resolve();
            });
        });
    }

    async seekTo(time: number) : Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(time);
            this.remote.seekTo(time, error => {
                if (error) reject(error);
                resolve();
            });
        });
    }

    async subtitles(enable: boolean) : Promise<void> {
        return new Promise((resolve, reject) => {
            if (enable)
                this.remote.changeSubtitles(0, error => {
                    if (error) reject(error);
                    else resolve();
                })
            else
                this.remote.subtitlesOff(error => {
                    if (error) reject(error);
                    else resolve();
                });
        });
    }
}