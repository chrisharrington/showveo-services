import watch from 'node-watch';

import { File } from '@lib/models';

export enum WatcherEvent {
    Update = 'update',
    Remove = 'remove'
}

export class Watcher {
    private handlers: any;
    private buffer: { [key: string] : any };
    private delay: number = 10*1000;

    constructor(...directories: string[]) {
        this.handlers = {};
        this.handlers[WatcherEvent.Update] = [];
        this.handlers[WatcherEvent.Remove] = [];
        this.buffer = {};

        directories.forEach((directory: string) => watch(directory, { recursive: true }, (event: WatcherEvent, name: string) => this.onFileChanged(event, name)));
    }

    on(event: WatcherEvent, func: (file: File) => void) {
        this.handlers[event].push(func);
    }

    private onFileChanged(event: WatcherEvent, path: string) {
        const timeout = this.buffer[path];
        if (timeout)
            clearTimeout(timeout);

        this.buffer[path] = setTimeout(() => {
            this.handlers[event].forEach(handler => handler(new File(path)));
        }, this.delay);
    }
}