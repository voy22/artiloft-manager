# Data: requests, objects, storage

[← README](../README.md) · [Install](install.md) · [Interface](interface.md) · **Data** · [Project structure](structure.md)

- [Overview](#overview)
- [Where the data is stored](#where-the-data-is-stored)
- [GraphQL files](#graphql-files)
- [Shopify base class](#shopify-base-class): [`queryRequestData`](#queryrequestdata), [`queryRequest`](#queryrequest), [`queryRequests`](#queryrequests), [`request`](#request)
- [ShopifyObject](#shopifyobject)
- [ShopifyResponse](#shopifyresponse)
- [ShopifyCollection](#shopifycollection)
- [ShopifyRequestHandler](#shopifyrequesthandler)
- [ProjectApiClient](#projectapiclient)
- [ProjectStorage](#projectstorage)
- [Utilities](#utilities): `grapfqlQuery`, `benchmark`, `CallStack`
- [Other sources: HTTP and scraping](#other-sources-http-and-scraping)
- [Recipes](#recipes)

## Overview

```
  lib/Products.js (your class, extends Shopify)
        │  queryRequestData / queryRequests            quick: plain JSON
        │  createShopifyObject('Product') ─────────►   ShopifyObject ── request('queryGetProducts')
        │                                                   │                 │
        │                                                   │                 ▼
        │                                                   │           ShopifyResponse ── data() list() objects()
        │                                                   │                 │
        │                                                   ├─ prepare() ─► ShopifyRequestHandler (pages + progress)
        │                                                   ├─ save()/load() ► json/ShopifyObjects/Product/<id>.json
        │                                                   └─ collection() ─► ShopifyCollection ─ build()/load()
        ▼                                                                           json/ShopifyObjects/Product.json
  project.apiClient()  = ProjectApiClient (axios, config.json url + token)  ──►  Shopify Admin GraphQL API
  project.storage()    = ProjectStorage  (projects/<project>/json/)
```

Two levels of API:

- **`Shopify` query helpers** — `queryRequestData`, `queryRequests`: a query file in, plain JSON out.
  Good for counts, settings, one-off reads.
- **`ShopifyObject` family** — objects with typed access (`prop`), local cache (`save`, `load`),
  bundles (`ShopifyCollection`), paginated downloads with progress (`ShopifyRequestHandler`).
  Good for catalogs that are downloaded once and processed many times.

## Where the data is stored

Everything a project stores lives in its own `json/` folder (ignored by git):

```
projects/dev.artiloft.ch/json/
  Products/                        ← Shopify.storage():  json/<ClassName>/, created by $INIT
    details.json                   ← saved $DETAILS of the class
    products.json                  ← anything the class writes with this.storage().file(…)
  ShopifyObjects/                  ← ShopifyObject.storage()
    Product/                       ← ShopifyObject.dir(): json/ShopifyObjects/<type>/
      10302694752599.json          ← ShopifyObject.save(): one object, file = id()
      10302695506263.json
    Product.json                   ← ShopifyCollection.build(): bundle of the folder above
    Collection/ …
    Collection.json
```

**`json/<ClassName>/details.json`** — the details panel of the class ([Interface](interface.md#details-panel-details)):

```json
{"Global":{"Products":1520,"Collections":42},"Downloaded":{"Products loaded":1520,"Take time":"00:03:12.45","Datetime":"24.09.2026 10:15:00"}}
```

**`json/ShopifyObjects/Product/10302694752599.json`** — the node as returned by the query:

```json
{"id":"gid://shopify/Product/10302694752599","title":"Cobra Water Mixable Oil 40ml","tags":["oil","paints"],"variants":{"nodes":[{"id":"gid://shopify/ProductVariant/5190","sku":"41010014"}]}}
```

**`json/ShopifyObjects/Product.json`** — array of all saved objects of the type:

```json
[{"id":"gid://shopify/Product/10302694752599","title":"Cobra …"},{"id":"gid://shopify/Product/10302695506263","title":"Rembrandt …"}]
```

The JSON files are written compact (one line). Format them in the editor when reading.

## GraphQL files

Queries are files, not strings in the code:

```
projects/dev.artiloft.ch/graphql/
  Products/                    ← for Shopify.queryRequest*(): folder = class name
    queryGetProductsCount.graphql
  Product/                     ← for ShopifyObject: folder = capitalized type
    queryGetProducts.graphql
    fragmentProductFields.graphql
  Shop/
    get.graphql                ← ShopifyObject.get()
```

The name is given without `.graphql`. Features of the loader ([`grapfqlQuery`](#utilities)):

**Fragments** — `fragment { fileName }` is replaced by the content of `fileName.graphql` from the same folder
(recursively, loops are reported):

```graphql
# Product/queryGetProducts.graphql
query GetProducts($cursor: String) {
    products(first: 50, after: $cursor) {
        edges {
            node {
                fragment { fragmentProductFields }
            }
            cursor
        }
        pageInfo { hasNextPage }
    }
}
```

```graphql
# Product/fragmentProductFields.graphql
id
title
tags
variants(first: 100) { nodes { id sku } }
```

**Variables** — standard GraphQL variables, passed as an object: `request('queryProduct', { id })`.

**Templates** — `${path}` is replaced by a value from the *context* object before sending
(`ShopifyObject.request` uses the data of the object as context). Useful for mutations built from local data:

```graphql
# Metafield/createProductUniqueKey.graphql
mutation {
  metafieldsSet(metafields: [{
      ownerId: "${ownerId}", value: "${value}",
      namespace: "custom", key: "key", type: "single_line_text_field"
  }]) {
    metafields { id }
    userErrors { field message }
  }
}
```

```js
const metafield = this.createShopifyObject('Metafield', { ownerId: variant.prop('id'), value: `rt-${sku}` });
await metafield.request('createProductUniqueKey');
```

Nested paths work (`${product.handle}`); unknown paths are left as is. Values are inserted as text, not escaped:
prefer GraphQL variables for user text.

Leading `#` comment lines of a file are allowed.

## Shopify base class

```js
import { Shopify } from 'artiloft-manager';
export class Products extends Shopify { … }
```

| Method | Returns |
|---|---|
| `project()` | the [`Project`](structure.md#the-project-object) |
| `config()` | parsed `config.json` of the project (`{}` when missing) |
| `path(sub?)` | `projects/<project>` or a path inside it |
| `storage(name?)` | [`ProjectStorage`](#projectstorage) of `json/<ClassName>/`, or of `json/<name>/` |
| `apiClient()` | [`ProjectApiClient`](#projectapiclient) of the project |
| `createShopifyObject(type, data?)` | new [`ShopifyObject`](#shopifyobject) |
| `query(file)` | text of `graphql/<file>.graphql` (fragments resolved) |
| `request(query, variables?)` | send a query text, raw axios response |
| `queryRequest(file, variables?)` | send `graphql/<ClassName>/<file>.graphql`, raw axios response |
| `queryRequestData(file, variables?)` | same, returns the first root field of `data` |
| `queryRequests(file, variables?, total)` | all pages of a connection, array of nodes, progress popup |

The query helpers look for files in `graphql/<ClassName>/` of the project whose code calls them
(see [inheritance](structure.md#inheritance-of-projects)). On a network/HTTP error they show the
[error popup](interface.md#error) and return `undefined`.

### queryRequestData

```graphql
# graphql/Shop/queryInfo.graphql
query { shop { name currencyCode plan { displayName } } }
```

```js
export class Shop extends Shopify {
    async info() {
        const shop = await this.queryRequestData('queryInfo');
        // → { name: 'Artiloft', currencyCode: 'CHF', plan: { displayName: 'Basic' } }
        await this.$DETAILS({ Shop: { name: shop.name, currency: shop.currencyCode } }, true);
    }
}
```

With variables:

```js
const product = await this.queryRequestData('queryProduct', { id: 'gid://shopify/Product/1' });
```

### queryRequest

The raw [axios response](https://axios-http.com/docs/res_schema): `response.data` is the GraphQL body.

```js
const response = await this.queryRequest('queryInfo');
response.status;                   // 200
response.data.data.shop.name;      // 'Artiloft'
response.data.errors;              // GraphQL errors, if any
response.data.extensions.cost;     // { requestedQueryCost, throttleStatus: { currentlyAvailable, … } }
```

### queryRequests

Downloads every page of a connection. The query must accept `$cursor` and return `edges { node cursor }`
and `pageInfo { hasNextPage }` (see `queryGetProducts` above). `total` is used for the progress percentage;
nothing is requested when it is `0`.

```js
async download() {
    const { count } = await this.queryRequestData('queryGetProductsCount');
    const products = await this.queryRequests('queryGetProducts', {}, count);
    // → [{ id, title, … }, …]  plain nodes
    await this.storage().file('products.json').write(products);
    await this.$DETAILS({ Products: { downloaded: products.length } }, true);
}
```

It shows the progress popup (`Loaded 150/1520 ( Requests: 3 )`, the query cost and balance),
waits when the Shopify throttle balance is low and stops on `Esc` returning the nodes loaded so far.

### request

Send a query text built in code:

```js
const response = await this.request(`query { productsCount { count } }`);
response.data.data.productsCount.count;
```

## ShopifyObject

One Shopify entity (product, collection, menu, metafield…) with its data, its query folder and its cache.

```js
const product = this.createShopifyObject('Product');                 // empty
const shop = this.createShopifyObject('shop');                       // type is capitalized for graphql/: Shop/
const metafield = this.createShopifyObject('Metafield', { ownerId, value });
```

The **type** selects `graphql/<Type>/` (capitalized) and `json/ShopifyObjects/<type>/` (as given).

| Method | Description |
|---|---|
| `type()` | the type |
| `project()` | the project |
| `data(value?)` | get / replace the plain data |
| `prop(name)` | typed access to a field, see below |
| `prop(name, value)`, `prop({ a, b })` | set one / several fields |
| `id()` | last part of `data.id`: `gid://shopify/Product/123` → `'123'` |
| `clone(data?)` | new object of the same type with a deep copy of the data, or with `data` |
| `request(file, variables?, context = data)` | send `graphql/<Type>/<file>.graphql` → [`ShopifyResponse`](#shopifyresponse) |
| `get()` `create()` `update()` `delete()` | `request('get' \| 'create' \| 'update' \| 'delete')` with the data as context; `update()` without `data.id` sends `create` |
| `response()` | the last `ShopifyResponse` |
| `prepare(file, list?)` | [`ShopifyRequestHandler`](#shopifyrequesthandler) for paginated requests |
| `storage()` | `ProjectStorage` of `json/ShopifyObjects/` |
| `dir()` | `ProjectStorage` of `json/ShopifyObjects/<type>/` (created) |
| `save()` | write the data to `json/ShopifyObjects/<type>/<id>.json` |
| `load(id?)` | read the data from that file |
| `collection()` | [`ShopifyCollection`](#shopifycollection) of the type |

`request()` throws on a network error (the message starts with the file name) and returns `undefined` when the
query file is missing (after the error popup). When the previous response reported a low throttle balance, the next
`request()` of the project waits first.

### prop

`prop(name)` wraps the value by its shape:

| Value | Returns |
|---|---|
| `null`, missing | `undefined` |
| string, number, boolean | the value |
| array, or `{ nodes: [...] }` | `ShopifyCollection` of `ShopifyObject`s |
| object | `ShopifyObject` of type `name` |

```js
product.prop('title');                                   // 'Cobra Water Mixable Oil'
product.prop('featuredImage').prop('src');               // nested object
const variants = product.prop('variants');               // { nodes: [...] } → ShopifyCollection
variants.length();                                       // 3
variants.list().map(v => v.prop('sku'));                 // ['41010014', …]
product.prop('tags').list().map(t => t.data());         // array of strings → collection too: ['oil', 'paints']

product.prop('title', 'New title');                      // set
product.prop({ vendor: 'Royal Talens', status: 'ACTIVE' });
```

### Example: get and cache

```graphql
# graphql/Shop/get.graphql
query { shop { id name email primaryDomain { url } currencyCode } }
```

```js
async info() {
    const shop = this.createShopifyObject('shop');
    const response = await shop.get();
    const data = response.data();             // { id, name, email, … }
    shop.data(data);
    await shop.save();                        // json/ShopifyObjects/shop/<shop id>.json
    await this.$DETAILS({ 'Shop info': { name: data.name, url: data.primaryDomain.url } }, true);
}
```

## ShopifyResponse

Returned by `ShopifyObject.request()`. Wraps the axios response and normalizes connections:
`edges[].node` and `nodes` both become arrays.

| Method | Returns |
|---|---|
| `data()` | the first root field: array for connections, object otherwise |
| `list()` | all root fields flattened into one array of `ShopifyObject` clones |
| `objects()` | `data()` as `ShopifyObject` clones (throws when there is no data) |
| `map(...keys)` | `{ 'key1_key2': ShopifyObject }` from `list()` |
| `errors()`, `error()` | GraphQL errors of the body / the first one (`{ message, … }`) |
| `hasNext()`, `cursor()` | pagination of the first root field |
| `cost()`, `balance()`, `sleep()` | query cost, throttle balance, suggested wait in ms |
| `shopifyObject()` | the object that sent the request |

```js
const response = await this.createShopifyObject('MetafieldDefinition').request('queryList');
if (response.error()) throw new Error(response.error().message);

response.data();                          // [{ id, key, ownerType, … }, …]
response.list();                          // [ShopifyObject, …]
const byKey = response.map('ownerType', 'key');
byKey['PRODUCT_specification'];           // ShopifyObject
```

`userErrors` of mutations are part of `data()`, not of `errors()`:

```js
const result = (await product.request('mutationSetPrice', { input })).data();
if (result.userErrors?.length) throw new Error(result.userErrors[0].message);
```

## ShopifyCollection

A list of `ShopifyObject`s of one type and its bundle file `json/ShopifyObjects/<type>.json`.

| Method | Description |
|---|---|
| `list(array?)` | get / set the objects (plain items are wrapped) |
| `length()` | number of objects |
| `filter(fn)` | new collection with the matching objects |
| `map(field)` | `{ [prop(field)]: ShopifyObject }` — an index, not `Array.map` |
| `build()` | write all `json/ShopifyObjects/<type>/*.json` into the bundle |
| `load()` | read the bundle → array of `ShopifyObject`, `undefined` when there is no bundle |
| `file(name?)` | `ProjectStorage` of the bundle; with `name`: `json/ShopifyObjects/<name>.json` |
| `exists()` | whether the bundle exists |

```js
const products = this.createShopifyObject('Product').collection();

let list = await products.load();          // [ShopifyObject, …] from Product.json
if (!list) {
    await this.download();                 // saves Product/<id>.json files
    await products.build();                // → Product.json
    list = await products.load();
}

const bySku = {};
for (const product of list) {
    for (const variant of product.prop('variants')?.list() || []) {
        bySku[variant.prop('sku')] = variant;
    }
}

const variants = product.prop('variants');
const withoutSku = variants.filter(v => !v.prop('sku'));
const metafields = variant.prop('metafields').map('key');   // { key: ShopifyObject }
```

Reading one bundle is much faster than thousands of files: rebuild it after every download.

## ShopifyRequestHandler

Paginated requests with the progress popup. Created by `ShopifyObject.prepare(file)`; the query must accept
`$cursor` and return `edges { cursor }` and `pageInfo { hasNextPage }`.

| Method | Description |
|---|---|
| `total(count)` | set the expected number of items and show the progress popup |
| `request()` | next page → `ShopifyResponse`; `undefined` when all pages are loaded |
| `index()` | number of requests sent |
| `benchmark()` | after the last page: `{ info: '00:03:12.45', seconds, datetime: '24.09.2026 10:15:00' }` |

It waits when the throttle balance is low, updates the popup (`Loaded 150/1520`, cost, balance) and hides it after
the last page. A response without data hides the popup and throws.

```js
async download() {
    const product = this.createShopifyObject('Product');
    const { count } = (await product.request('queryGetProductsCount')).data();

    const dir = await product.dir();
    await dir.clean();                                    // remove old Product/*.json

    const requestHandler = await product.prepare('queryGetProducts');
    requestHandler.total(count);
    let response, cnt = 0;
    while (response = await requestHandler.request()) {
        for (const item of response.objects()) {
            await item.save();                            // Product/<id>.json
            cnt++;
        }
    }
    await product.collection().build();                  // Product.json

    await this.$DETAILS({
        Downloaded: { Products: cnt, 'Take time': requestHandler.benchmark()?.info },
    }, true);
}
```

The handler does not listen to `Esc`: to make the loop stoppable, check a flag set on `PROGRESS_STOP`
([Interface › Progress](interface.md#progress)) and emit `PROGRESS_END` when leaving early.

`prepare(file, list)` with a list sends `list[n]` as the template context of each request, where `n` is the
number of items loaded so far.

## ProjectApiClient

The HTTP client of a project: an [axios](https://axios-http.com) instance for the Shopify Admin GraphQL API,
created from `config.json` on the first `project.apiClient()` call.

```json
{
    "url": "https://your-store.myshopify.com/admin/api/2025-01/graphql.json",
    "token": "shpat_...",
    "timeout": 60000,
    "retries": 3
}
```

| Key | Meaning |
|---|---|
| `url` | GraphQL endpoint |
| `token` | Admin API access token, sent as `X-Shopify-Access-Token` |
| `timeout` | ms per request, default `60000` |
| `retries` | attempts for queries, default `3` |

`request(query, variables?, context?)` → axios response. Queries are retried on timeouts, connection errors and
HTTP 5xx (1 s, 2 s… between attempts); **mutations are sent once**, because a timed-out mutation may have reached
the shop. `context` fills the `${path}` templates.

```js
const client = this.apiClient();
const response = await client.request('query ($id: ID!) { product(id: $id) { title } }', { id });
response.data.data.product.title;
```

Another API can be plugged in with `project.apiClient(client)` — any object with
`async request(query, variables, context)` returning `{ data: { data, errors, extensions } }`.

## ProjectStorage

File helper bound to a path. `project.storage()` is `json/` of the project; `dir()` and `file()` return new
`ProjectStorage` objects without touching the disk.

| Method | Description |
|---|---|
| `dir(name)` | storage of a subfolder |
| `file(name)` | storage of a file |
| `path()` | absolute path |
| `create()` | create the folder (recursively) or an empty file; returns itself |
| `createDir(name)` | `dir(name).create()` |
| `read()` | file: parsed JSON for `.json`, `Buffer` otherwise, `undefined` when missing or empty; folder: `Dirent[]` of its files |
| `write(content)` | file only: a string as is, anything else as JSON |
| `remove()` | delete the file / the folder with its content |
| `clean()` | empty the file / delete the content of the folder |
| `exists()`, `stat()` | `fs.Stats` or `undefined` |

```js
const storage = this.storage();                         // json/Products/ (Shopify) or project.storage()
const html = await storage.dir('html').create();        // json/Products/html/
await html.file('p-123.html').write(body);
const cached = await html.file('p-123.html').read();    // Buffer
cached?.toString();

await storage.file('stats.json').write({ ok: 10, errors: 2 });
const stats = await storage.file('stats.json').read();  // { ok: 10, errors: 2 }

for (const entry of await html.read()) {                // Dirent[]
    console.log(entry.name);
}
await html.clean();
```

## Utilities

**`grapfqlQuery.query(name, folder)`** — loads `<folder>/<name>.graphql` with fragments resolved; cached per
process. Used by all the helpers above.

```js
import { grapfqlQuery } from 'artiloft-manager';
const text = await grapfqlQuery.query('Product/queryGetProducts', this.path('graphql'));
```

**`benchmark`** — timing of long operations (one shared timer):

```js
import { benchmark } from 'artiloft-manager';
benchmark.start();
…
const { info, seconds, datetime } = benchmark.finish();   // '00:01:05.30', 65.3, '24.09.2026 10:15:00'
```

**`CallStack.getProject(projectsFolder)`** — the name of the first project folder found in the current call stack.
The shell uses it to find the `graphql/` of the project whose code is running (see [inheritance](structure.md#inheritance-of-projects)).

## Other sources: HTTP and scraping

Nothing ties a project to Shopify. A scraper is a plain class (or a `Shopify` subclass for the storage and
details helpers) with its own HTTP client. Add the libraries to your repository: `npm install axios cheerio`.

```json
// projects/example-shop.com/config.json
{ "url": "https://www.example-shop.com", "requestDelay": 300 }
```

```js
// projects/example-shop.com/lib/Products.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Shopify, coreEvent } from 'artiloft-manager';

export class Products extends Shopify {
    #client;
    #run = false;

    constructor(project) {
        super(project);
        coreEvent.on(coreEvent.PROGRESS_STOP, () => (this.#run = false));
    }

    async $INIT() {
        await super.$INIT();                                  // json/Products/
        this.#client = axios.create({ baseURL: this.config().url, timeout: 30000 });
    }

    $download() { return 'Download product pages to json/Products/html/'; }
    async download() {
        const { data } = await this.#client.get('/catalog');
        const $ = cheerio.load(data);
        const urls = $('a.product').map((i, a) => $(a).attr('href')).get();

        const html = await this.storage().dir('html').create();
        const products = [];
        this.#run = true;
        coreEvent.emit(coreEvent.PROGRESS_START);
        try {
            for (let i = 0; i < urls.length && this.#run; i++) {
                const page = await this.#client.get(urls[i]);
                await html.file(`${i}.html`).write(page.data);
                const $p = cheerio.load(page.data);
                products.push({ url: urls[i], title: $p('h1').text().trim() });
                coreEvent.emit(coreEvent.PROGRESS, { label: 'Download', text: urls[i], percent: [i + 1, urls.length] });
                await new Promise(r => setTimeout(r, this.config().requestDelay));
            }
        } finally {
            coreEvent.emit(coreEvent.PROGRESS_END);
        }
        await this.storage().file('products.json').write(products);
        await this.$DETAILS({ Products: { pages: urls.length, parsed: products.length } }, true);
    }
}
```

## Recipes

**Migration between projects** — read the cache of one project and write it to the store of another.
The source is read from its `json/` folder, the target is the current project (its `config.json`, its client):

```js
import { Shopify, ProjectStorage, coreEvent } from 'artiloft-manager';

export class Products extends Shopify {
    $migrate() { return 'Create the products of carandache.com in this store'; }
    async migrate() {
        const source = new ProjectStorage(this.path('../carandache.com/json'));
        const items = await source.dir('Products').file('products.json').read();

        coreEvent.emit(coreEvent.PROGRESS_START);
        try {
            for (const [i, item] of items.entries()) {
                const product = this.createShopifyObject('Product', item);    // target: this project
                const result = (await product.request('createProduct')).data(); // graphql/Product/createProduct.graphql
                if (result.userErrors?.length) throw new Error(result.userErrors[0].message);
                coreEvent.emit(coreEvent.PROGRESS, { label: 'Migrate', text: item.title, percent: [i + 1, items.length] });
            }
        } finally {
            coreEvent.emit(coreEvent.PROGRESS_END);
        }
    }
}
```

**Refresh only when missing** — `load()` the bundle, download when it returns `undefined` (see
[ShopifyCollection](#shopifycollection)).

**Report a failure** — `throw new Error('…')` in a method; the shell shows it in the error popup.
