import { RemoteSocket, MessageType, MessageResponse, MessageRequest } from '@root/lib/socket';
import CastService from '@api/cast';
import { Device } from '@root/api/cast/device';


interface SeekMessageRequest extends MessageRequest {
    host: string;
    time: number;
}

export default class Seek {
    public static initialize() {
        RemoteSocket.on(MessageType.SeekRequest, this.run.bind(this));
    }

    private static async run(message: SeekMessageRequest) {
        try {
            const devices = await CastService.devices(),
                device = devices.find((d: Device) => d.host === message.host);

            if (!device)
                throw new Error(`No device with ID \"${message.host}\" found.`);

            device.seekTo(message.time);

            RemoteSocket.emit(message.deviceId, MessageType.SeekResponse, MessageResponse.success());
        } catch (e) {
            console.log(`[api] ${MessageType.SeekResponse} error.`);
            console.error(e);
            RemoteSocket.emit(message.deviceId, MessageType.SeekResponse, MessageResponse.error(e));
        }
    }
}