import { Request, Response } from 'express';
import * as fs from 'fs';
import delay from 'delay-stream';

import Config from '@lib/config';

const FfmpegCommand = require('fluent-ffmpeg');

export default class Video {
    private static command: any;

    public static play(request: Request, response: Response, path: string) {
        const stat = fs.statSync(path),
            fileSize = stat.size,
            range = request.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
            response.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': (end-start)+1,
                'Content-Type': 'video/webm',
            });
            fs.createReadStream(path, { start, end }).pipe(response);
        } else {
            response.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/webm',
            });
            fs.createReadStream(path).pipe(response);
        }
    }

    public static stream(request: Request, response: Response, path: string) {
        this.abort();

        response.set('Content-Type', 'video/mp4');

        const command = new FfmpegCommand()
            .input(path)
            .inputOptions(
                '-hwaccel', 'nvdec'
            )
            .seekInput(request.query.seek || 0)
            .outputFormat('mp4')
            .outputOptions(['-movflags frag_keyframe+empty_moov+faststart', '-frag_size 4096'])
            .audioCodec('libmp3lame')
            .videoCodec('h264_nvenc')
            .outputOptions(
                '-vsync', '0',
                '-c:v', 'h264_nvenc',
                '-acodec', 'libmp3lame',
                '-b:v', '5M',
                '-sn'
            )
            .on('error', error => console.log(`[api] Encoding error: ${error.message}`))
            .on('exit', () => console.log('[api] Encoder exited.'))
            .on('close',  () => console.log('[api] Encoder closed.'))
            .on('end', () => console.log('[api] Encoder finished.'))
            .on('stderr', line => console.log(line));

        command.stream(delay(Config.streamDelay)).pipe(response, { end: true });

        // command.stream(response, { end: true });

        this.command = command;
    }

    public static abort() {
        if (this.command) {
            this.command.kill('SIGINT');
            this.command = null;
        }
    }
}