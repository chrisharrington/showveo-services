import ChromecastApi from 'chromecast-api';

import { RemoteSocket, MessageType, MessageResponse, MessageRequest } from '@root/lib/socket';

import { Device } from './device';

interface DeviceMap {
    [name: string] : Device;
}

export default class Cast {
    private static initialized: Promise<void>;
    private static deviceMap: DeviceMap;

    static initialize() {
        console.log('[api] Initializing cast devices.');

        this.deviceMap = {};
        this.initialized = new Promise(resolve => setTimeout(resolve, 100));

        const client = new ChromecastApi();

        client.on('device', async raw => {
            const device = Device.fromRaw(raw);

            console.log(`[api] Device found: ${device.name}`);
            this.deviceMap[device.host] = device;

            const devices = await this.devices();
            RemoteSocket.broadcast(MessageType.GetDevicesResponse, MessageResponse.success<{ devices: Device[] }>({ devices }));
        });
    }

    static async devices() : Promise<Device[]> {
        await this.initialized;
        return Object.values(this.deviceMap).sort((first: Device, second: Device) => first.name.localeCompare(second.name));
    }
}