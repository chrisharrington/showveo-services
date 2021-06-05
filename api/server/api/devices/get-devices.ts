import { RemoteSocket, MessageType, MessageResponse, MessageRequest } from '@root/lib/socket';
import CastService from '@api/cast';
import { Device } from '@root/api/cast/device';


export default class GetDevices {
    public static initialize() {
        RemoteSocket.on(MessageType.GetDevicesRequest, this.run.bind(this));
    }

    private static async run(message: MessageRequest) {
        try {
            const devices = await CastService.devices();
            RemoteSocket.emit(message.deviceId, MessageType.GetDevicesResponse, MessageResponse.success<{ devices: Device[] }>({ devices }));
        } catch (e) {
            console.log(`[api] ${MessageType.GetDevicesRequest} error.`);
            console.error(e);
            RemoteSocket.emit(message.deviceId, MessageType.GetDevicesResponse, MessageResponse.error(e));
        }
    }
}