# artiloft-manager

Console shell (Midnight Commander-like UI) for managing **web projects**:
fetching data from cloud services (Shopify GraphQL, HTTP scraping of any web shop),
processing it, sending it back, or migrating it from one web project to another.

The shell shows web projects in three levels:

```
Projects / <web project> / <class> / <method>
```

Selecting a method with `Enter` executes it.

## Install

```sh
npm install artiloft-manager
```

## Entry point

Create a script anywhere in your repository, import `Artiloft` and point it to the folder with web projects:

```js
// src/index.js
import { Artiloft } from 'artiloft-manager';

const artiloft = new Artiloft();
await artiloft.init(new URL('../projects', import.meta.url));
```

```sh
node ./src/index.js
```

`init(projectsPath)` accepts:

| Value | Resolved as |
|---|---|
| `URL` / `file:` string | the file path of the URL (independent of the current directory) |
| absolute path | as is |
| relative path (default `'projects'`) | from the package root: the nearest `package.json` above the current directory |

## Web project layout

```
projects/
  my-shop.com/                  ← level 1: web project (folder name)
    config.json                 ← optional, available as this.config()
    lib/
      Products.js               ← level 2: class, file name == exported class name
      Products/…                ← helpers (sub-folders of lib/ are not listed)
    graphql/
      Products/queryGetProducts.graphql
    json/                       ← storage, created by the shell (this.storage())
```

Every `lib/*.js` file must export a class with the same name as the file.
The constructor receives the `Project` instance.

```js
import { Shopify, coreEvent } from 'artiloft-manager';

export class Products extends Shopify {
    $DESCRIPTION() {                  // hint of the class
        return 'Products operations';
    }

    $download() {                     // hint of the method "download"
        return 'Download products to json/';
    }
    async download() {                // level 3: method, executed by Enter
        const count = await this.queryRequestData('queryGetProductsCount');
        this.$DETAILS({ Products: { count: count.count } }, true);
    }
}
```

### Conventions

| Member | Purpose |
|---|---|
| `method()` | public method, listed on level 3 |
| `$method()` | returns the hint text of `method` |
| `$DESCRIPTION()` | hint text of the class |
| `async $INIT()` | called once after the class is created |
| `async $DETAILS(data, force)` | content of the details panel; called on class selection and after every method |
| `async $DESTROY()` | called on exit (`F1`, `q`, `Ctrl+C`) |

Methods whose names start with `$` are hidden. Methods of `Shopify` and its parents are hidden too
(`Shopify.prototype.$protected = true`); a class does not have to extend `Shopify`.

## Exports

| Export | Description |
|---|---|
| `Artiloft` | the shell, entry point |
| `coreEvent` | event bus of the UI: `DETAILS`, `VIEWER`, `PROGRESS_START`, `PROGRESS`, `PROGRESS_END`, `PROGRESS_STOP`, `ERROR`, `EXIT`, … |
| `Shopify` | base class of a Shopify web project: `config()`, `storage()`, `request()`, `queryRequest()`, `queryRequests()`, `createShopifyObject()` |
| `ShopifyResponse`, `ShopifyRequestHandler`, `ShopifyCollection`, `ShopifyProduct` | Shopify helpers |
| `ProjectApiClient` | axios GraphQL client (`config.json`: `url`, `token`, optional `timeout`, `retries`) |
| `benchmark`, `grapfqlQuery`, `CallStack` | utilities |

### UI events

```js
coreEvent.emit(coreEvent.PROGRESS_START);
coreEvent.emit(coreEvent.PROGRESS, { label: 'Download 50 %', text: 'Loaded 50/100', percent: 50 });
coreEvent.emit(coreEvent.PROGRESS_END);

coreEvent.emit(coreEvent.VIEWER, { label: 'Title', content: { Section: { name: 'value' } } });
coreEvent.emit(coreEvent.ERROR, new Error('Something went wrong'));
```

## Keys

| Key | Action |
|---|---|
| `↑` / `↓` | move |
| `←` / `→` | first / last item |
| `Enter` | open project / class, execute method |
| `Tab` | switch between the list and the details panel |
| `Esc` | stop the running progress, close a popup |
| `F1`, `q`, `Ctrl+C` | exit |
