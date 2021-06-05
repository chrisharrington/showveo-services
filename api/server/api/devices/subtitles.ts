import { RemoteSocket, MessageType, MessageResponse, MessageRequest } from '@root/lib/socket';
import CastService from '@api/cast';
import { Device } from '@root/api/cast/device';


interface SubtitlesMessageRequest extends MessageRequest {
    host: string;
    enabled: boolean;
}

export default class Subtitles {
    public static initialize() {
        RemoteSocket.on(MessageType.SubtitlesRequest, this.run.bind(this));
    }

    private static async run(message: SubtitlesMessageRequest) {
        try {
            const devices = await CastService.devices(),
                device = devices.find((d: Device) => d.host === message.host);

            if (!device)
                throw new Error(`No device with ID \"${message.host}\" found.`);

            device.subtitles(message.enabled);

            RemoteSocket.emit(message.deviceId, MessageType.SubtitlesResponse, MessageResponse.success());
        } catch (e) {
            console.log(`[api] ${MessageType.SubtitlesResponse} error.`);
            console.error(e);
            RemoteSocket.emit(message.deviceId, MessageType.SubtitlesResponse, MessageResponse.error(e));
        }
    }
}