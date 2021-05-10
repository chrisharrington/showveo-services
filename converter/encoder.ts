import * as fs from 'fs';
import ffprobe from 'ffprobe';
import * as path from 'path';
import srt2vtt from 'srt-to-vtt';

import { File, FileState, StreamType } from '@lib/models';
import { convertingFileName } from '@lib/constants';

const FfmpegCommand = require('fluent-ffmpeg');

// ffmpeg \
//     -hwaccel nvdec \
//     -i "/media/movies/2 Fast 2 Furious (2003)/2 Fast 2 Furious (2003).mp4" \
//     -vsync 0 \
//     -acodec libmp3lame \
//     -c:v h264_nvenc \
//     -b:v 5M \
//     output.mp4

export interface EncodingResult {
    conversion: void | Error;
    subtitles: void | Error;
}

export default class Encoder {
    private command: any;
    private file: File;

    constructor() {
        process.on('SIGINT', () => this.abort());
    }

    async run(file: File) : Promise<EncodingResult> {
        const probe = await ffprobe(file.path, { path: 'ffprobe' });

        const [ conversionResult, subtitlesResult ] = await Promise.all([
            this.convert(file, probe),
            this.extractSubtitles(file, probe)
        ]);

        return {
            conversion: conversionResult,
            subtitles: subtitlesResult
        };
    }

    private async convert(file: File, probe: any) : Promise<void | Error> {
        const temp = `${path.dirname(file.output)}/${convertingFileName}`;

        return new Promise<void | Error>(async (resolve: (status: void | Error) => void) => {
            try {
                console.log(`[converter] Encoding ${file.path} to ${file.output}.`);

                const video = probe.streams.find(stream => stream.codec_type === 'video').codec_name,
                    audio = probe.streams.find(stream => stream.codec_type === 'audio').codec_name;

                console.log(`[converter] Video codec: ${video}`);
                console.log(`[converter] Audio codec: ${audio}`);

                if (video === 'h264' && audio === 'mp3') {
                    console.log(`[converter] No encoding necessary.`);
                    fs.renameSync(file.path, file.output);
                    resolve();
                    return;
                }

                const videoIndex = probe.streams.findIndex(stream => stream.codec_type === StreamType.Video);
                if (videoIndex === -1)
                    return resolve(new Error('No appropriate video stream found.'));
                
                let audioIndex = probe.streams.findIndex(stream => stream.codec_type === StreamType.Audio && stream.tags.language === 'eng');
                if (audioIndex === -1)
                    audioIndex = probe.streams.findIndex(stream => stream.codec_type === StreamType.Audio);
                if (audioIndex === -1)
                    return resolve(new Error('No appropriate audio stream found.'));

                const command = new FfmpegCommand(file.path)
                    .inputOptions(
                        '-hwaccel', 'nvdec'
                    )
                    .output(temp)
                    .outputOptions(
                        '-vsync', '0',
                        '-c:v', 'h264_nvenc',
                        '-acodec', 'libmp3lame',
                        '-b:v', '5M',
                        '-sn',
                        '-map', '0:' + videoIndex,
                        '-map', '0:' + audioIndex
                    );

                command.on('start', () => console.log(`[converter] Converting: ${file.path}`));
                command.on('stderr', line => console.log(line));
                command.on('error', error => {
                    console.error(`[converter] Failed to convert ${file.path}.`);
                    resolve(error);
                });
                command.on('end', () => this.onEnd(file, temp, () => resolve()));
                command.run();
            } catch (e) {
                this.deleteFiles(temp)
                resolve(e);
            }
        });
    }

    private async extractSubtitles(file: File, probe: any) : Promise<void | Error> {
        console.log(`[converter] Extracting subtitles: ${file.path}`)

        let index = probe.streams.findIndex(stream => stream.codec_type === 'subtitle' && stream.tags.language === 'eng' && stream.disposition.forced === 0);
        if (index === -1)
            index = probe.streams.findIndex(stream => stream.codec_type === 'subtitle' && stream.tags.language === 'eng');

        if (index === -1)
            return new Error('No valid subtitle stream found.');

        return new Promise(resolve => {
            new FfmpegCommand(file.path)
                .format('srt')
                .inputOptions(
                    '-txt_format', 'text'
                )
                .outputOptions(
                    '-map', '0:' + index
                )
                .on('end', () => {
                    console.log(`[converter] Subtitles extracted: ${file.path}`);
                    resolve();
                })
                .on('error', error => resolve(error))
                .pipe(srt2vtt())
                .pipe(fs.createWriteStream(`${path.dirname(file.output)}/${path.parse(file.output).name}.vtt`));
        });
    }

    private abort() {
        try { this.command.ffmpegProc.stdin.write('q'); } catch (e) {}
        this.deleteFiles(File.getPathForState(this.file.output, FileState.Converting));
    }

    private onEnd(file: File, temp: string, resolve: () => void) {
        console.log(`[converter] Finished processing ${file.path}.`);
        fs.renameSync(temp, file.output);
        fs.unlinkSync(file.path);
        resolve();
    }

    private deleteFiles(...files: string[]) {
        files.forEach((file: string) => {
            if (fs.existsSync(file))
                fs.unlinkSync(file);
        })
    }
}