# Interface

[← README](../README.md) · [Install](install.md) · **Interface** · [Data](data.md) · [Project structure](structure.md)

- [Screen layout](#screen-layout)
- [Hotkeys](#hotkeys)
- [$-functions](#-functions)
- [Details panel: `$DETAILS`](#details-panel-details)
- [Hint line](#hint-line)
- [Popups](#popups): [viewer](#viewer), [progress](#progress), [error](#error)
- [Text markup](#text-markup)
- [Events reference](#events-reference)

## Screen layout

```
┌ Projects / dev.artiloft.ch / Products ─┐┌ Details ──────────────────────────────┐
│ ..                                     ││ Downloaded                            │
│ info                                   ││   Products loaded  1520               │
│ download                  ← selected   ││   Take time        00:03:12.45        │
│ cleanProducts                          ││                                       │
│                                        ││                                       │
└────────────────────────────────────────┘└───────────────────────────────────────┘
 Download products from Shopify                                      ← hint line
  F1 Help    F2 Read    F3 Hint    …                                  ← key bar
```

| Area | Content |
|---|---|
| list (left) | level 1: web projects · level 2: classes of a project · level 3: methods of a class. The title shows the path |
| details (right) | whatever the class sends with `$DETAILS` |
| hint line | `$DESCRIPTION()` of the selected class or `$method()` of the selected method |
| key bar | function key labels |

`..` returns to the previous level. `Enter` on a method executes it; when it finishes, the class
`$DETAILS` is called again to refresh the panel.

## Hotkeys

**List**

| Key | Action |
|---|---|
| `↑` `↓` (`k` `j`) | move |
| `←` / `→` | first / last item |
| `Enter` | open the project / class, execute the method, `..` goes up |
| `Tab`, `Shift+Tab` | focus the details panel and back |
| `Esc` | emit `PROGRESS_STOP` (stop request of a running method) |
| `F1`, `q`, `Ctrl+C` | exit: `$DESTROY` of every loaded class, then the process ends |

**Details panel** (after `Tab`): `↑` `↓` scroll, `PgUp` `PgDn` page.

**Viewer popup**: `↑` `↓` scroll, `PgUp` `PgDn` page, `Esc` close. With actions: `←` `→` / `Tab` `Shift+Tab`
move between buttons, `Enter` / `Space` press the focused button, the action `key` presses its button directly.

**Progress popup**: `Esc` emits `PROGRESS_STOP` — the method decides when to stop (see [progress](#progress)).

**Error popup**: `Enter`, `Space` or `Esc` close.

## $-functions

The shell lists every method of a class on level 3 **except** the ones whose name starts with `$`
and the methods of the platform base class (`Shopify` and its parents, marked with `$protected`).
`$`-functions are the protocol between a class and the shell; they are hidden from the list and called by the shell itself.

| Function | Called | Purpose |
|---|---|---|
| `constructor(project)` | once, when the project is opened | receives the [`Project`](structure.md#the-project-object); call `super(project)` when extending `Shopify` |
| `async $INIT()` | once, right after the constructor | async setup: folders, caches, clients. `Shopify.$INIT` creates `json/<ClassName>/`, call `await super.$INIT()` |
| `$DESCRIPTION()` | class selected | returns the hint text of the class |
| `$<method>()` | method selected | returns the hint text of `<method>`, e.g. `$download()` for `download()` |
| `async $DETAILS()` | class selected, after every method | shows the details of the class ([below](#details-panel-details)) |
| `async $DESTROY()` | on exit | cleanup, saving. `Shopify.$DESTROY` saves the details |

Any other `$name` is simply hidden: use it for helpers that must not be executable from the list.
JavaScript private methods (`#name`) are hidden as well.

```js
export class Products extends Shopify {
    $DESCRIPTION() { return 'Products operations'; }       // hint of the class

    $download() { return 'Download products from Shopify'; } // hint of download()
    async download() { … }                                   // listed, executed by Enter

    async $loadCache() { … }   // hidden helper
    #parse(html) { … }         // hidden helper
}
```

A method receives no arguments. Everything it needs comes from `this.config()`, the storage or the
previous methods.

## Details panel: `$DETAILS`

The panel shows either a string or sections of name/value pairs:

```js
{
    'Shop info': {                 // section title (yellow)
        name: 'Artiloft',          // name (bold)  value
        currency: 'CHF',
    },
    'Downloaded': {
        'Products loaded': 1520,
    },
}
```

```
Shop info
  name      Artiloft
  currency  CHF
Downloaded
  Products loaded  1520
```

### Classes extending `Shopify`

`Shopify` implements `$DETAILS(data, force)`:

| Call | Effect |
|---|---|
| `await this.$DETAILS(data, true)` | replace the details with `data` (object or string) and show them |
| `await this.$DETAILS(data)` | update the values of **existing** names only (in any section), new names are ignored |
| `await this.$DETAILS()` | show and return the current details; the first call loads `json/<ClassName>/details.json` |

Details that were set during the session are saved to `json/<ClassName>/details.json` on exit and shown
again on the next start: the panel keeps the result of the last run.

```js
async download() {
    …
    const details = await this.$DETAILS();          // current sections
    await this.$DETAILS({
        ...details,
        Downloaded: {
            'Products loaded': cnt,
            'Take time': requestHandler.benchmark()?.info,
        },
    }, true);
}

async syncAvailability() {
    …
    await this.$DETAILS({ 'Products loaded': cnt }); // only updates an existing "Products loaded"
}
```

To recalculate the details on every class selection, override `$DETAILS` and delegate to the parent:

```js
async $DETAILS(data, force) {
    if (data) {
        return await super.$DETAILS(data, force);
    }
    return await super.$DETAILS(await this.#stats(), true);
}
```

### Plain classes

A class without a platform shows details by emitting the `DETAILS` event:

```js
import { coreEvent } from 'artiloft-manager';

export class Pages {
    #project;
    constructor(project) { this.#project = project; }

    async $DETAILS() {
        coreEvent.emit(coreEvent.DETAILS, {
            content: { Project: { name: this.#project.name() } },
        });
    }
}
```

`coreEvent.emit(coreEvent.DETAILS, { content })` can be emitted from any place at any time, e.g. to show
intermediate results of a long method. It bypasses the saved details of `Shopify`.

## Hint line

One line under the panels. It shows `$DESCRIPTION()` of the selected class and `$<method>()` of the
selected method, and is hidden when the function is missing or returns an empty string. Plain text only,
[markup](#text-markup) is not interpreted.

## Popups

### Viewer

A scrollable popup (90% of the screen) with optional buttons:

```js
coreEvent.emit(coreEvent.VIEWER, {
    label: 'Collections',            // title
    content: {                       // string or sections, as in the details panel
        Summary: { total: 42, empty: 3 },
    },
    hint: ' {bold}ESC{/bold} close ', // optional: bottom line when there are no actions
    actions: [                       // optional buttons
        { label: 'Save json', key: 's', onSelect: async () => { … } },
        { label: 'Close', focused: true },   // no onSelect: just closes
    ],
});
```

| Field | Meaning |
|---|---|
| `label` | popup title, default `Viewer` |
| `content` | string (with [markup](#text-markup)) or sections object |
| `hint` | bottom line when there are no actions |
| `actions[].label` | button text |
| `actions[].focused` | the button focused on open |
| `actions[].key` | a key that presses the button directly, shown as `Save json (S)` |
| `actions[].onSelect` | called after the popup closes; may emit another `VIEWER` |

`coreEvent.emit` does not wait for the user. A confirmation is written as callbacks:

```js
async deleteAll() {
    coreEvent.emit(coreEvent.VIEWER, {
        label: 'Delete products',
        content: `{red-fg}${count}{/red-fg} products will be deleted from the store`,
        actions: [
            { label: 'Delete', onSelect: async () => await this.#delete() },
            { label: 'Cancel', focused: true },
        ],
    });
}
```

Errors thrown inside `onSelect` are not caught by the shell: catch them and emit [`ERROR`](#error).

### Progress

```js
coreEvent.emit(coreEvent.PROGRESS_START, { label: 'Download' });   // show (label optional)
coreEvent.emit(coreEvent.PROGRESS, {
    label: 'Download',                // title
    text: 'Page 3/10',                // line above the bar
    percent: [3, 10],                 // [done, total] → "Download 30%", or a number 0…100
    hint: 'Balance 980',              // line under the bar
});
coreEvent.emit(coreEvent.PROGRESS_END);                             // hide
```

`Esc` (and every error popup) emits `PROGRESS_STOP` but does **not** stop the method: the method listens
to it and leaves its loop. Always emit `PROGRESS_END`, also after a stop or an error:

```js
export class Pages {
    #run = false;
    constructor(project) {
        coreEvent.on(coreEvent.PROGRESS_STOP, () => (this.#run = false));
    }
    async download() {
        this.#run = true;
        coreEvent.emit(coreEvent.PROGRESS_START);
        try {
            for (let i = 1; i <= total && this.#run; i++) {
                await this.#page(i);
                coreEvent.emit(coreEvent.PROGRESS, { label: 'Download', text: `Page ${i}/${total}`, percent: [i, total] });
            }
        } finally {
            coreEvent.emit(coreEvent.PROGRESS_END);
        }
    }
}
```

`Shopify.queryRequests` and `ShopifyRequestHandler` drive this popup themselves, see [Data](data.md).

### Error

```js
coreEvent.emit(coreEvent.ERROR, new Error('Something went wrong'));   // title "Error", the stack
coreEvent.emit(coreEvent.ERROR, { code: 'HTTP 404', message: url });  // title = code, text = message
```

An exception thrown by a method or by `$DETAILS` is caught by the shell and shown the same way,
so `throw new Error('…')` is enough to report a failure. Errors while loading a class (syntax error, failing
`$INIT`, missing import) are shown as **System Error** (`SYS_ERROR`); the class is not listed.

## Text markup

The details panel, the viewer and the progress popup interpret [blessed tags](https://github.com/chjj/blessed#content--tags):

```
{bold}bold{/bold}  {underline}…{/underline}  {yellow-fg}text{/yellow-fg}  {red-bg}…{/red-bg}
{green-fg}  {cyan-fg}  {white-fg}  {#ff8800-fg}   {center}…{/center}   {/} closes all
```

Data from outside (titles, HTML) may contain `{` and `}`: escape them as `{open}` / `{close}`,
e.g. `text.replace(/[{}]/g, c => c === '{' ? '{open}' : '{close}')`.

## Events reference

`coreEvent` is a Node.js `EventEmitter` shared by the shell and the projects.

| Event | Payload | Emitted by | Effect |
|---|---|---|---|
| `DETAILS` | `{ content }` | classes | fills the details panel |
| `VIEWER` | `{ label, content, hint, actions }` | classes | viewer popup |
| `PROGRESS_START` | `{ label }` (optional) | classes, Shopify helpers | shows the progress popup |
| `PROGRESS` | `{ label, text, percent, hint }` | classes, Shopify helpers | updates it |
| `PROGRESS_END` | – | classes, Shopify helpers | hides it |
| `PROGRESS_STOP` | – | shell: `Esc`, error popups | listen to it to stop loops |
| `ERROR` | `Error` or `{ code, message }` | classes, shell | error popup |
| `SYS_ERROR` | `Error` | shell | system error popup (class loading) |
| `EXIT` | – | shell: `F1` `q` `Ctrl+C` | `$DESTROY` of all classes, exit; emit it to quit from code |
| `PROJECT_SELECTED`, `PROJECT_SET`, `PROJECT_FIRST`, `PROJECT_LAST` | `{ item, index }` | list | internal navigation |

Listeners registered in a constructor live as long as the process: register them once per class, not in a method.
