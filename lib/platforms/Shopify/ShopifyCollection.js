import { basename } from 'path';
// import { CallStack } from '../utils/CallStack.js';
import { CallStack } from '../../utils/CallStack.js';
import { grapfqlQuery } from '../../utils/GrapfqlQuery.js';
import { ShopifyResponse } from './ShopifyResponse.js';
import { ShopifyRequestHandler } from './ShopifyRequestHandler.js';

export class ShopifyCollection {
    #shopifyObject;
    #list;
    #file;
    constructor(shopifyObject) {
        this.#shopifyObject = shopifyObject;
    }
    async file(fileName) {
        if (fileName) {
            this.#file = (await this.#shopifyObject.storage()).file(`${fileName}.json`);
        }
        this.#file ||= (await this.#shopifyObject.storage()).file(`${this.#shopifyObject.type()}.json`);
        return this.#file;
    }
    async exists() {
        return this.file().exists();
    }
    length() {
        return this.#list.length;
    }
    list(v, type = "") {
        if (arguments.length) {
            if (v.length) {
                const shopifyClass = this.#shopifyObject.constructor;
                this.#list = v.map(i => {
                    if (i instanceof shopifyClass) {
                        return i;
                    }
                    return new shopifyClass(this.#shopifyObject.project(), i.id ? i.id.split('/')[3] : type, i);
                });
            } else {
                this.#list = [];
            }
        }
        return this.#list;
    }
    filter(f) {
        const coll = new ShopifyCollection(this.#shopifyObject);
        coll.list(this.#list.filter(f))
        return coll;
    }
    map(field) {
        return this.#list.reduce( (r,i) => {
            r[i.prop(field)] = i;
            return r;
        }, {});
    }
    async load() {
        const file = await this.file();
        if (!await file.exists()) return;
        const list = await file.read();
        const shopifyClass = this.#shopifyObject.constructor;
        this.#list = list.map(i => this.#shopifyObject.clone(i));
        // this.#list = list.map(i => new shopifyClass(this.#shopifyObject.project(), i.id.split('/')[3]));
        return this.#list;
    }
    #getType(v) {
        return v.split('/')[4];
    }
    async build() {
        const dir = await this.#shopifyObject.dir();
        const files = await dir.read();
        const list = [];
        for (const file of files) {
            const content = await dir.file(file.name).read();
            list.push(content);
        }

        const bundleFile = await this.file();
        await bundleFile.write(list);
    }
}