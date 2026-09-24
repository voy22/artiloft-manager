import blessed from 'blessed';
import { coreEvent } from '../core/CoreEvent.js';
import { UIPanelDetails } from './UIPanelDetails.js';

const BUTTON_STYLE = { fg: 'blue', bg: 'white' };
const BUTTON_FOCUS_STYLE = { fg: 'white', bg: 'blue', bold: true };
const DEFAULT_HINT = ' {bold}↑/↓{/bold} scroll   {bold}PgUp/PgDn{/bold} page   {bold}ESC{/bold} close ';

/*
 * Universal popup viewer.
 *
 * coreEvent.emit(coreEvent.VIEWER, {
 *     label: 'Title',
 *     content: 'text' | {section: {name: value, ...}, ...},
 *     hint: ' {bold}ESC{/bold} close ', // optional, overrides the hint shown when there are no actions
 *     actions: [                      // optional, defaults to plain "ESC to close" viewer
 *         {label: 'Delete', focused: true, onSelect: async () => {...}},
 *         {label: 'Cancel'},          // onSelect is optional, just closes the popup
 *         {label: 'Save json', key: 's', onSelect: async () => {...}}, // key: also triggers action directly
 *     ]
 * });
 *
 * When actions are provided, buttons are shown at the bottom of the popup.
 * Focus between them is moved with Left/Right or Tab/Shift-Tab, and
 * Enter/Space triggers the focused action. Escape always just closes
 * the popup without triggering any action.
 */
export class UIPopupViewer extends blessed.box {
    #content;
    #hint;
    #actionsBar;
    #buttons = [];
    #actions = [];
    #focusIndex = 0;
    #keyBindings = [];

    constructor(settings) {
        super({
            ...settings,
            label: ' Viewer ',
            top: 'center',
            left: 'center',
            width: '90%',
            height: '90%',
            padding: { left: 1, right: 1 },
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'blue',
                border: { fg: 'white', bg: 'blue' },
                label: { fg: 'white', bg: 'blue', bold: true }
            },
            shadow: true,
            tags: true,
            hidden: true,
        });

        this.#content = blessed.box({
            parent: this,
            top: 0,
            left: 0,
            right: 0,
            bottom: 1,
            tags: true,
            scrollable: true,
            alwaysScroll: true,
            keys: true,
            vi: true,
            mouse: true,
            style: { fg: 'white', bg: 'blue' },
            scrollbar: { style: { bg: 'white' } },
        });

        this.#hint = blessed.box({
            parent: this,
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            tags: true,
            style: { fg: 'blue', bg: 'white' },
            content: DEFAULT_HINT,
        });

        this.#actionsBar = blessed.box({
            parent: this,
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            tags: true,
            hidden: true,
            style: { fg: 'blue', bg: 'white' },
        });

        blessed.box({
            parent: this.#actionsBar,
            top: 0,
            right: 1,
            width: 'shrink',
            height: 1,
            tags: true,
            style: { fg: 'blue', bg: 'white' },
            content: '{bold}←/→{/bold} or {bold}Tab{/bold} focus   {bold}Enter{/bold} select   {bold}ESC{/bold} cancel',
        });

        this.#content.key(['pageup', 'pagedown'], (ch, key) => {
            const page = this.#content.height - this.#content.iheight || 1;
            this.#content.scroll((key.name === 'pageup' ? -1 : 1) * page);
            this.screen.render();
        });

        this.screen.key(['left', 'S-tab'], () => this.#move(-1));
        this.screen.key(['right', 'tab'], () => this.#move(1));
        this.screen.key(['enter', 'space'], () => this.#activateFocused());
        this.screen.key(['escape'], () => this.close());

        coreEvent.on(
            coreEvent.VIEWER,
            data => this.view(data)
        );
    }

    view(data) {
        this.setLabel(` {bold}${data.label || 'Viewer'}{/bold} `);
        const content = typeof data.content === 'string'
            ? data.content
            : UIPanelDetails.format(data.content);
        this.#content.setContent(content);
        this.#content.scrollTo(0);
        this.#hint.setContent(data.hint || DEFAULT_HINT);
        this.#setActions(data.actions);

        if (this.hidden) {
            this.screen.saveFocus();
        }
        this.show();
        this.#content.focus();
        if (this.#buttons.length) {
            const defaultIndex = this.#actions.findIndex(a => a.focused);
            this.#focus(Math.max(0, defaultIndex));
        }
        this.screen.render();
    }

    #setActions(actions) {
        this.#buttons.forEach(button => button.destroy());
        this.#buttons = [];
        this.#keyBindings.forEach(({key, handler}) => this.screen.unkey(key, handler));
        this.#keyBindings = [];
        this.#actions = actions || [];

        if (!this.#actions.length) {
            this.#actionsBar.hide();
            this.#hint.show();
            return;
        }
        this.#hint.hide();
        this.#actionsBar.show();

        let left = 1;
        this.#actions.forEach((action, index) => {
            const label = action.key ? ` ${action.label} (${action.key.toUpperCase()}) ` : ` ${action.label} `;
            const button = blessed.box({
                parent: this.#actionsBar,
                top: 0,
                left,
                width: label.length,
                height: 1,
                align: 'center',
                tags: true,
                mouse: true,
                content: label,
                style: { ...BUTTON_STYLE },
            });
            button.on('click', () => this.#activate(index));
            this.#buttons.push(button);
            left += label.length + 2;

            if (action.key) {
                const handler = () => { if (!this.hidden) this.#activate(index); };
                this.screen.key([action.key], handler);
                this.#keyBindings.push({key: action.key, handler});
            }
        });
    }

    #move(offset) {
        if (this.hidden || !this.#buttons.length) return;
        this.#focus(this.#focusIndex + offset);
    }

    #focus(index) {
        if (!this.#buttons.length) return;
        this.#focusIndex = (index + this.#buttons.length) % this.#buttons.length;
        this.#buttons.forEach((button, i) => {
            Object.assign(button.style, i === this.#focusIndex ? BUTTON_FOCUS_STYLE : BUTTON_STYLE);
        });
        this.screen.render();
    }

    #activateFocused() {
        if (this.hidden || !this.#buttons.length) return;
        this.#activate(this.#focusIndex);
    }

    #activate(index) {
        const action = this.#actions[index];
        this.close();
        action?.onSelect?.();
    }

    close() {
        if (this.hidden) return;
        this.hide();
        this.screen.restoreFocus();
        this.screen.render();
    }
}
