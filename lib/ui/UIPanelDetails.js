import blessed from 'blessed';
import {coreEvent} from '../core/CoreEvent.js';

export class UIPanelDetails extends blessed.box {
    constructor(settings) {
        super({
            ...settings,
            top: 0,
            left: '50%',
            width: '50%',
            height: '100%-2',
            label: ' {bold}Details{/bold} ',
            padding: 1,
            tags: true,
            border: { type: 'line' },
            style: {
                border: { fg: 'white' },
                focus: { border: { fg: 'yellow' } }
            },
            scrollable: true,
            alwaysScroll: true,
            keys: true,
            vi: true,
            mouse: true,
            scrollbar: { style: { bg: 'yellow' } }
        });
        coreEvent.on(
            coreEvent.DETAILS,
            data => this.update(data)
        );

        this.key(['pageup', 'pagedown'], (ch, key) => {
            const page = this.height - this.iheight || 1;
            this.scroll((key.name === 'pageup' ? -1 : 1) * page);
            this.screen.render();
        });
    }
    update(data) {
        const content = data.content || "";
        if (typeof content === 'string') {
            this.setContent(content);
            return;
        }
        this.setContent(UIPanelDetails.format(content));
        this.screen.render();
    }
    static format(content) {
        const width = Object.values(content)
            .map((props) => Object.keys(props))
            .reduce((result, keys) => Math.max(
                keys.reduce((max, val) => Math.max(val.length, max), 0),
                result
            ), 0);
        return Object.entries(content)
            .map(([title, props]) => {
                return `{bold}{yellow-fg}${title}{/yellow-fg}{/bold}\n` + Object.entries(props).map(([name, value]) => {
                    return `{bold}  ${name.padEnd(width)}{/bold}  ${value}`
                }).join("\n")
            })
            .join("\n");
    }
}