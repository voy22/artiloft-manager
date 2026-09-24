# Project structure

[← README](../README.md) · [Install](install.md) · [Interface](interface.md) · [Data](data.md) · **Project structure**

- [Three levels](#three-levels)
- [Projects](#projects)
- [Classes](#classes)
- [Methods](#methods)
- [Config](#config)
- [The Project object](#the-project-object)
- [Inheritance of projects](#inheritance-of-projects)

## Three levels

The shell shows exactly three levels, each mapped to the file system:

| Level | In the shell | On disk | In code |
|---|---|---|---|
| 1 | web project | a folder in `projects/` | a [`Project`](#the-project-object) object |
| 2 | class | `projects/<project>/lib/<Class>.js` | an exported class, one instance per project |
| 3 | method | a method of that class | called by `Enter` |

```
projects/                              ← the folder passed to artiloft.init()
  dev.artiloft.ch/                     ← level 1
    config.json                        ← this.config()
    config.json.example                ← committed template of config.json
    lib/
      Products.js                      ← level 2: export class Products
      Shop.js                          ← level 2: export class Shop
      Products/                        ← helpers of Products.js, not listed
        CollectionsHelper.js
    graphql/                           ← query files (see Data)
      Product/queryGetProducts.graphql
    json/                              ← storage, created by the shell, not committed
  prod.artiloft.ch/                    ← level 1, inherits dev.artiloft.ch
    config.json
    lib/
      Products.js                      ← export class Products extends dev Products
```

## Projects

Every subfolder of the projects folder is a web project; the folder name is the project name shown in the
list (any name: a domain such as `dev.artiloft.ch` is a good one). Files next to the folders are ignored.
A folder without `lib/` is listed but has no classes — handy for shared data (`sources/json/…`).

A project is loaded lazily: its `config.json` is read and its classes are created when it is opened for the
first time. Changes of the code or the config need a restart of the shell.

## Classes

Every `lib/*.js` file (only the top level of `lib/`) must export a class **named like the file**:

```js
// projects/demo-site/lib/Pages.js
export class Pages {
    constructor(project) { … }
}
```

The shell imports the file, creates one instance with the [`Project`](#the-project-object), calls
`$INIT()` and lists the class. A class that fails to import, to construct or to `$INIT` is not listed; the
error is shown as **System Error**. Classes are listed in file name order.

A class may extend:

- **`Shopify`** — the platform class for Shopify stores: config, storage, API client, GraphQL helpers,
  saved details ([Data](data.md#shopify-base-class)). Useful for scrapers too, for its storage and details.
- **nothing** — a plain class; it gets the `Project` in the constructor and uses `coreEvent` for the UI.
- **a class of another project** — see [inheritance](#inheritance-of-projects).

Code shared by several classes of a project lives in subfolders of `lib/` (`lib/Products/…`) and is imported
with relative paths. Libraries from npm are installed in the repository of the projects (`npm install cheerio`).

## Methods

Level 3 lists the methods of the class and of its parent classes, own methods first, in the order of their
definition. Not listed:

- names starting with `$` — the [$-functions](interface.md#-functions) and hidden helpers;
- `#private` methods;
- the methods of `Shopify` and its parents (the prototype marked `$protected = true`).

A method takes no arguments, may be `async`, and reports through the UI: [details panel](interface.md#details-panel-details),
[popups](interface.md#popups), or `throw` for an error. Its hint is returned by `$<method>()`.

```js
export class Products extends Shopify {
    $DESCRIPTION() { return 'Products operations'; }

    $download() { return 'Download products from Shopify'; }
    async download() { … }

    $cleanProducts() { return "Remove local json's of products"; }
    async cleanProducts() { … }
}
```

To mark a whole base class as "not listed", set `$protected` on its prototype, as `Shopify` does:

```js
export class MyPlatform { … }
MyPlatform.prototype.$protected = true;   // methods of MyPlatform and its parents are hidden
```

## Config

`config.json` in the project folder is parsed once, when the project is opened. It is optional (`{}` when missing)
and free-form: the keys are defined by your classes. `url` and `token` are used by the
[Shopify API client](data.md#projectapiclient).

```json
{
    "url": "https://your-store.myshopify.com/admin/api/2025-01/graphql.json",
    "token": "shpat_...",
    "vendor": "Caran d'Ache",
    "languages": ["en", "fr", "de", "it"],
    "requestDelay": 300
}
```

| Class | Access |
|---|---|
| extends `Shopify` | `this.config()` |
| plain | `project.config()` (the `project` of the constructor) |

```js
async $INIT() {
    await super.$INIT();
    const { url, requestDelay = 300 } = this.config();
    this.#client = new RequestClient(url, requestDelay);
}
```

Keep secrets only in `config.json` (ignored by git) and commit `config.json.example` with the same keys.
Other configuration files of a project are read explicitly:

```js
import { ProjectStorage } from 'artiloft-manager';
const categories = await new ProjectStorage(this.path('config_category.json')).read();
```

## The Project object

Passed to the constructor of every class; `Shopify` returns it from `this.project()`.

| Method | Returns |
|---|---|
| `name()` | folder name: `'dev.artiloft.ch'` |
| `path(sub?)` | `projects/dev.artiloft.ch` or a path inside it: `path('json/Products')` |
| `config(value?)` | the parsed `config.json`; with a value: replace it |
| `storage()` | [`ProjectStorage`](data.md#projectstorage) of `json/` |
| `apiClient(client?)` | the [API client](data.md#projectapiclient); with a value: replace it |
| `classes()` | names of the loaded classes |
| `getClass(name)` | the handler of a class: `methods()`, `description()`, `execute(method)` |
| `query(name, projectPath?)` | text of `graphql/<name>.graphql` of this (or another) project |

```js
export class Pages {
    #project;
    constructor(project) {
        this.#project = project;
    }
    async clean() {
        await this.#project.storage().dir('Pages').remove();   // projects/<project>/json/Pages
    }
}
```

## Inheritance of projects

Two stores with the same logic — a development store and the production store — are two projects, where one
reuses the classes of the other. `prod.artiloft.ch` inherits `dev.artiloft.ch`:

```
projects/
  dev.artiloft.ch/                     ← implementation
    config.json                        ← dev store: url, token
    lib/Menu.js  lib/Products.js  lib/Shop.js  lib/MetafieldDefinition.js
    lib/Products/…                     ← helpers
    graphql/…                          ← all queries
    json/                              ← dev data
  prod.artiloft.ch/                    ← only the wiring
    config.json                        ← prod store: url, token
    lib/Menu.js  lib/Products.js  lib/Shop.js  lib/MetafieldDefinition.js
    json/                              ← prod data
```

Each class of `prod.artiloft.ch` is one line of code:

```js
// projects/prod.artiloft.ch/lib/Products.js
import { Products as BaseProducts } from '../../dev.artiloft.ch/lib/Products.js';

export class Products extends BaseProducts {
}
```

What is shared and what stays per project:

| | Comes from | Why |
|---|---|---|
| methods, hints, `$INIT`, `$DETAILS` | **dev** (inherited code) | `extends` |
| helpers in `lib/Products/…` | **dev** | imported by the dev code |
| `this.config()`, API client, target store | **prod** | the instance is created with the prod `Project` |
| `this.storage()`, `json/`, saved details, `this.path()` | **prod** | the same |
| `graphql/` files | the project **whose file contains the running code** | the shell looks for the first project file in the call stack |

So `prod` needs neither `graphql/` nor helpers: running `download` in `prod.artiloft.ch` executes the code of
`dev.artiloft.ch/lib/Products.js`, loads the queries of `dev.artiloft.ch/graphql/`, sends them with the token of
`prod.artiloft.ch/config.json` and saves the result into `prod.artiloft.ch/json/`.

**Only the classes with a file in `prod/lib/` are listed**: leave a class out to hide it in production.

**Override or add methods** in the child. Queries of methods written in the child are looked up in the child's
`graphql/`, while `super.method()` keeps using the parent's:

```js
// projects/prod.artiloft.ch/lib/Products.js
import { Products as BaseProducts } from '../../dev.artiloft.ch/lib/Products.js';

export class Products extends BaseProducts {
    $DESCRIPTION() {
        return 'Products of the PRODUCTION store';
    }

    async download() {
        await super.download();                       // dev graphql, prod token and json/
        const details = await this.$DETAILS();
        await this.$DETAILS({ ...details, Store: { name: 'production' } }, true);
    }

    $publishAll() { return 'Publish all products (prod only)'; }
    async publishAll() {
        const publications = await this.queryRequestData('queryPublications');
        // → prod.artiloft.ch/graphql/Products/queryPublications.graphql
    }
}
```

**Rules for a class that is meant to be inherited:**

- take every setting from `this.config()` — never hard-code a store URL or a token;
- build paths with `this.path()`, `this.storage()`, `this.project()` — never with `import.meta.url`,
  which points to the parent's folder;
- keep the queries in the parent's `graphql/`;
- the child imports the parent by a relative path, so both projects live in the same projects folder.
