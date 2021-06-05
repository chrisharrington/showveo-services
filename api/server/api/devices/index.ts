import GetDevices from './get-devices';
import Cast from './cast';
import Pause from './pause';
import Unpause from './unpause';
import Seek from './seek';
import Subtitles from './subtitles';

export default class Devices {
    public static initialize() {
        [
            GetDevices,
            Cast,
            Pause,
            Unpause,
            Seek,
            Subtitles
        ].forEach(handler => handler.initialize());
    }
}