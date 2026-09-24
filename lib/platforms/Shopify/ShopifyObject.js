import { basename } from 'path';
// import { CallStack } from '../utils/CallStack.js';
import { CallStack } from '../../utils/CallStack.js';
import { grapfqlQuery } from '../../utils/GrapfqlQuery.js';
import { ShopifyResponse } from './ShopifyResponse.js';
import { ShopifyRequestHandler } from './ShopifyRequestHandler.js';
import { ShopifyCollection } from './ShopifyCollection.js';

export class ShopifyObject {
    #data;
    #project;
    #type;
    #response;
    constructor(project, type, data) {
        this.#project = project;
        this.#type = type;
        this.#data = data;
    }
    type() {
        return this.#type;
    }
    project() {
        return this.#project;
    }
    data(v) {
        return arguments.length ? this.#data = v : this.#data;
    }
    clone(data) {
        if (data) {
            return new ShopifyObject(this.#project, this.#type, data);
        }
        if (this.#data) {
            return new ShopifyObject(this.#project, this.#type, structuredClone(this.#data));
        } else {
            return new ShopifyObject(this.#project, this.#type)
        }
    }
    collection() {
        return new ShopifyCollection(this);
    }
    #capitalize(str) {
        if (!str) return '';
        return [str[0].toUpperCase(), ...str.slice(1)].join('');
    }
    async #query(fileName) {
        const originProject = CallStack.getProject(this.#project.path('..'));
        const name = this.#capitalize(this.#type);
        const originGraphqlPath = this.#project.path(`../${originProject}/graphql/${name}`);
        const query = await grapfqlQuery.query(fileName, originGraphqlPath);
        return query; 
    }
    async request(fileName, data, context = this.#data) {
        const query =  await this.#query(fileName);
        if (!query) return;
        if (this.#project.sleep) {
            await this.sleep(this.#project.sleep);
        }
        let response;
        try {
            response = await this.#project.apiClient().request(query, data, context);
        } catch (e) {
            /* the name of the query makes a network error readable */
            e.message = `${fileName}: ${e.message}`;
            throw e;
        }
        this.#response = new ShopifyResponse(response, this);
        this.#project.sleep = this.#response.sleep();
        return this.#response;
    }
    async prepare(fileName, list) {
        const query = await this.#query(fileName);
        // const handler = new ShopifyRequestHandler(query, this.#project.apiClient());
        const handler = new ShopifyRequestHandler(query, this, list);
        return handler;
    }
    response() {
        return this.#response;
    }
    id() {
        return basename(this.#data['id']);
    }
    async storage() {
        return await (await this.#project.storage()).dir(`ShopifyObjects`).create();
    }
    async dir() {
        const storage = await this.storage();
        return await storage.dir(this.#type).create();
    }
    async load(id) {
        const dir = await this.dir();
        const file = dir.file(`${id || this.id()}.json`);
        this.#data = await file.read();
    }
    async save() {
        const dir = await this.dir();
        const file = dir.file(`${this.id()}.json`);
        await file.write(this.#data);
    }
    async create() {
        return await this.request('create', undefined, this.#data);
    }
    async update() {
        if (this.#data?.id) {
            return await this.request('update', undefined, this.#data);
        }
        return await this.request('create', undefined, this.#data);
    }
    async delete() {
        return await this.request('delete', undefined, this.#data);
    }
    async get() {
        return await this.request('get', undefined, this.#data);
    }
    prop(name, v) {
        if (name.constructor !== String) {
            return Object.entries(name)
                .forEach(([key, val]) => this.prop(key, val));
        }
        const d = this.#data;
        if (arguments.length > 1) {
            return d[name] = v;
        }
        if (!(name in d) || d[name] === null || d[name] === undefined) return;
        if (d[name] instanceof Array) {
            const collection = new ShopifyCollection(new ShopifyObject(this.#project, name), name);
            collection.list(d[name]);
            return collection;
        }
        if (d[name]['nodes'] instanceof Array) {
            const collection = new ShopifyCollection(new ShopifyObject(this.#project, name), name);
            if (!d[name]) debugger;
            collection.list(d[name]['nodes']);
            return collection;
        }
        if (d[name] instanceof ShopifyObject) {
            return d[name];
        }
        if (typeof d[name] === 'object') {
            return new ShopifyObject(this.#project, name, d[name]);
        }
        return d[name];
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}