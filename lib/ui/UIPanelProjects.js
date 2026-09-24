import blessed from 'blessed';
import {coreEvent} from '../core/CoreEvent.js'
export class UIPanelProjects extends blessed.list {
    #current;
    #originalSelect;

    #setItemProcess;

    constructor(settings) {
        super({
            ...settings,
            top: 0,
            left: 0,
            width: '50%',
            height: '100%-2',
            label: ' {bold}Projects{/bold} ',
            tags: true,
            border: { type: 'line' },
            style: {
                selected: { bg: 'blue', fg: 'white' },
                border: { fg: 'white' },
                focus: { border: { fg: 'yellow' } }
            },
            keys: true,
            vi: true,
            scrollbar: { style: { bg: 'yellow' } }
        });
        this.#setItemProcess = false;

        this.key('left', () => {
            this.select(0);
            const index = this.selected;
            const item = this.getItem(index);
            coreEvent.emit(
                coreEvent.PROJECT_FIRST,
                {item, index}
            )
        });
        this.key('right', () => {
            this.select(this.items.length - 1);
            const index = this.selected;
            const item = this.getItem(index);
            coreEvent.emit(
                coreEvent.PROJECT_LAST,
                {item, index}
            )
        });
        this.key('enter', () => {
            const index = this.selected;
            const item = this.getItem(index);
            coreEvent.emit(
                coreEvent.PROJECT_SET,
                {item, index}
            )
        });

        this.#originalSelect = this.select;
        this.select = (v) => {
            if (this.#setItemProcess) {
                return;
            }
            this.#originalSelect.call(this, v);
            const index = this.selected;
            if (index === this.#current) return;
            this.#current = index;
            const item = this.getItem(index);
            coreEvent.emit(
                coreEvent.PROJECT_SELECTED,
                {item, index}
            )
        }; 
    }
    setItems(items) {
        this.#setItemProcess = true;
        super.setItems(items);
        this.#setItemProcess = false;
        this.select(0);
    }
    currentIndex(v) {
        return this.#current;
    }
    currentItem() {
        return this.getItem(this.#current);
    }
    currentLabel() {
        return this.getItem(this.#current)?.content
    }
}