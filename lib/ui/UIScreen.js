import blessed from 'blessed';
import {coreEvent} from '../core/CoreEvent.js';
export class UIScreen extends blessed.screen {
    constructor(settings = {}) {
        super({
            ...settings,
            smartCSR: true,
            title: 'Projects Commander',
            terminal: 'xterm-256color',
            cursor: {
                artificial: true,
                shape: 'block',
                blink: true,
                color: 'black'
            }
        });
        this.key(['f1', 'q', 'C-c'], () => {
            coreEvent.emit(coreEvent.EXIT);
            //process.exit(0);
        });
        this.key(['escape'], () => {
            coreEvent.emit(coreEvent.PROGRESS_STOP);
        });
    }
}