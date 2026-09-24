# artiloft-manager

Console shell (Midnight Commander-like UI) for managing **web projects**:
fetching data from cloud services (Shopify GraphQL, HTTP scraping of any web shop),
processing it, sending it back, or migrating it from one web project to another.

```
┌ Projects / dev.artiloft.ch / Products ─┐┌ Details ──────────────────────────┐
│ ..                                     ││ Downloaded                        │
│ info                                   ││   Products loaded  1520           │
│ download                               ││   Take time        00:03:12.45    │
│ cleanProducts                          ││                                   │
└────────────────────────────────────────┘└───────────────────────────────────┘
 Download products from Shopify
```

A web project is a folder with classes; the shell shows three levels — **project / class / method** —
and executes a method on `Enter`.

## Quick start

```sh
mkdir my-projects && cd my-projects
npx artiloft-manager init        # package.json, src/index.js, projects/ with demo projects
npm start
```

The entry point imports the shell and points it to the projects:

```js
// src/index.js
import { Artiloft } from 'artiloft-manager';

await new Artiloft().init(new URL('../projects', import.meta.url));
```

A class of a web project:

```js
// projects/my-shop.com/lib/Shop.js
import { Shopify } from 'artiloft-manager';

export class Shop extends Shopify {
    $DESCRIPTION() { return 'Shop settings'; }          // hint of the class

    $info() { return 'Show the shop info'; }             // hint of the method
    async info() {                                       // listed, executed by Enter
        const shop = await this.queryRequestData('queryInfo');   // graphql/Shop/queryInfo.graphql
        await this.$DETAILS({ Shop: { name: shop.name, currency: shop.currencyCode } }, true);
    }
}
```

## Documentation

| | |
|---|---|
| [**Install and setup**](docs/install.md) | `npx artiloft-manager init`, manual setup, entry point, running, debugging, updating |
| [**Interface**](docs/interface.md) | screen layout, hotkeys, `$`-functions, details panel (`$DETAILS`), hint line, popups (viewer, progress, error), text markup, events |
| [**Data**](docs/data.md) | where JSON is stored, GraphQL files, `queryRequestData` / `queryRequests`, `ShopifyObject`, `ShopifyResponse`, `ShopifyCollection`, `ShopifyRequestHandler`, `ProjectApiClient`, `ProjectStorage`, utilities, scraping over HTTP, migrations |
| [**Project structure**](docs/structure.md) | projects, classes, methods, `config.json`, the `Project` object, inheritance of projects (`dev` → `prod`) |

## Exports

```js
import {
    Artiloft,                                    // the shell
    coreEvent,                                   // UI events: DETAILS, VIEWER, PROGRESS*, ERROR, EXIT
    Shopify,                                     // base class of Shopify web projects
    ShopifyObject, ShopifyResponse, ShopifyCollection, ShopifyRequestHandler, ShopifyProduct,
    Project, ProjectStorage, ProjectApiClient,
    grapfqlQuery, benchmark, CallStack,
} from 'artiloft-manager';
```

Modules are also available by path: `artiloft-manager/core/ProjectManager` → `lib/core/ProjectManager.js`.

## License

ISC
