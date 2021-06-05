import { RemoteSocket, MessageType, MessageResponse, MessageRequest } from '@root/lib/socket';
import CastService from '@api/cast';
import { Device } from '@root/api/cast/device';


interface UnpauseMessageRequest extends MessageRequest {
    host: string;
}

export default class Unpause {
    public static initialize() {
        RemoteSocket.on(MessageType.UnpauseRequest, this.run.bind(this));
    }

    private static async run(message: UnpauseMessageRequest) {
        try {
            const devices = await CastService.devices(),
                device = devices.find((d: Device) => d.host === message.host);

            if (!device)
                throw new Error(`No device with ID \"${message.host}\" found.`);

            device.unpause();

            RemoteSocket.emit(message.deviceId, MessageType.UnpauseResponse, MessageResponse.success());
        } catch (e) {
            console.log(`[api] ${MessageType.UnpauseResponse} error.`);
            console.error(e);
            RemoteSocket.emit(message.deviceId, MessageType.UnpauseResponse, MessageResponse.error(e));
        }
    }
}