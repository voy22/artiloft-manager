import blessed from 'blessed';
import {coreEvent} from '../core/CoreEvent.js'

export class UIPopupError extends blessed.box {
    constructor(settings) {
        super({
            ...settings,
            label: ' Error ',
            top: 'center',
            left: 'center',
            width: '30%',
            height: 'shrink',
            padding: {
                left: 2,
                right: 2,
                top: 1,
                bottom: 1
            },
            border: {
                type: 'line',
                fg: 'red'
            },
            style: {
                fg: 'white',
                bg: 'red',
                border: {
                    fg: 'white',
                    bg: 'red'
                },
                label: {
                    fg: 'white',
                    bg: 'red',
                    bold: true,
                }
            },
            shadow: true,
            tags: true,
            hidden: true,
            align: 'center'
        });

        this.key(['enter', 'space', 'escape'], () => {
            this.hide();
        });
        coreEvent.on(
            coreEvent.SYS_ERROR,
            data => this.showSysError(data)
        );
        coreEvent.on(
            coreEvent.ERROR,
            data => this.showError(data)
        );
    }
    showSysError(e) {
        const stack = e.stack.split("\n");
        this.setLabel("{bold} System Error {/bold}");
        // this.setContent(`${stack[0]}\n${stack[1]?.trim()}\n${stack[2]?.trim()}`);
        this.setContent(`${stack.map(i => i.trim()).join("\n")}`);
        coreEvent.emit(coreEvent.PROGRESS_STOP);
        this.show();
        this.focus();
        this.screen.render();
    }
    showError(e) {
        if (e.stack) {
            const stack = e.stack.split("\n");
            this.setLabel("{bold} Error {/bold}");
            // this.setContent(`${stack[0]}\n${stack[1]?.trim()}\n${stack[1]?.trim()}`);
            this.setContent(`${stack.map(i => i.trim()).join("\n")}`);
        } else {
            this.setLabel(`{bold} ${e.code} {/bold}`);
            this.setContent(`${e.message}`);
        }
        coreEvent.emit(coreEvent.PROGRESS_STOP);
        this.show();
        this.focus();
        this.screen.render();
    }
}