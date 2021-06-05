import { RemoteSocket, MessageType, MessageResponse, MessageRequest } from '@root/lib/socket';
import CastService from '@api/cast';
import { Device } from '@root/api/cast/device';


interface PauseMessageRequest extends MessageRequest {
    host: string;
}

export default class Pause {
    public static initialize() {
        RemoteSocket.on(MessageType.PauseRequest, this.run.bind(this));
    }

    private static async run(message: PauseMessageRequest) {
        try {
            const devices = await CastService.devices(),
                device = devices.find((d: Device) => d.host === message.host);

            if (!device)
                throw new Error(`No device with ID \"${message.host}\" found.`);

            device.pause();

            RemoteSocket.emit(message.deviceId, MessageType.PauseResponse, MessageResponse.success());
        } catch (e) {
            console.log(`[api] ${MessageType.PauseResponse} error.`);
            console.error(e);
            RemoteSocket.emit(message.deviceId, MessageType.PauseResponse, MessageResponse.error(e));
        }
    }
}