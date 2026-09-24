import blessed from 'blessed';
import {coreEvent} from '../core/CoreEvent.js';

export class UIPopupProgress extends blessed.box {
    #text;
    #progressbar;
    #hint;
    constructor(settings = {}) {
        super({
            ...settings,
            label: ' Progress ',
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
                fg: 'blue'
            },
            style: {
                bg: 18,
                border: {
                    fg: 'white',
                    bg: 18
                },
                label: {
                    bg: 18,
                    bold: true,
                }
            },
            shadow: true,
            tags: true,
            hidden: true,
            align: 'center'
        });

        this.#text = blessed.text({
            parent: this,
            top: 0,
            left: 0,
            width: '88%',
            align: 'center',
            content: 'Download',
            tags: true,
            style: {
                fg: 'white',
                bg: 18
            }
        });

        this.#progressbar = blessed.progressbar({
            parent: this,
            top: 2,
            left: 0,
            width: '88%',
            height: 1,
            filled: 50,
            orientation: 'horizontal',
            style: {
                bg: 19, 
                bar: {
                    bg: 'white'
                },
                border: {
                    fg: 'white'
                }
            }
        });

        this.#hint = blessed.text({
            parent: this,
            top: 3,
            left: 0,
            width: '88%',
            content: '',
            style: {
                fg: 16,
                bg: 18
            }
        });

        this.key(['escape'], () => {
            coreEvent.emit(coreEvent.PROGRESS_STOP);
        });

        coreEvent.on(
            coreEvent.PROGRESS_START,
            data => this.start(data)
        );
        coreEvent.on(
            coreEvent.PROGRESS,
            data => this.progress(data)
        );
        coreEvent.on(
            coreEvent.PROGRESS_END,
            data => this.end(data)
        );
    }

    start(data) {
        if (data && data['label']) {
            this.setLabel(' ' + data['label'] + ' ');
        }
        this.#progressbar.setProgress(0);
        super.show();
        this.focus();
        this.screen.render();
    }

    progress(data) {
        if (data['text']) {
            this.#text.setContent(data['text'])
        }
        if (data['percent'] instanceof Array) {
            const percent = Math.ceil(Math.min(((data['percent'][0] / data['percent'][1]) * 100), 100));
            data['label'] = (data['label'] || '') + ` ${percent}%`;
            this.#progressbar.setProgress(percent);
        } else {
            this.#progressbar.setProgress(data['percent']);
        }
        if (data['label']) {
            this.setLabel(' ' + data['label'] + ' ');
        }
        if (data['hint']) {
            this.#hint.setContent(data['hint'])
        }
        this.screen.render();
    }
    end() {
        this.hide();
    }
}