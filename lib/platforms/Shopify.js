import { join } from 'path';
import { coreEvent } from '../core/CoreEvent.js';
import { CallStack } from '../utils/CallStack.js';
import { relative } from 'path';
// import { ShopifyGraphqlAPI } from './Shopify/ShopifyGraphqlAPI.js'
import { ShopifyObject } from './Shopify/ShopifyObject.js'

export class Shopify {
    static counter = 0;
    #project;
    #requestsProgress;
    #details;
    #detailsCount;
    #storage;
    constructor(project) {
        this.#detailsCount = 0;
        this.#project = project;
        coreEvent.on(
            coreEvent.PROGRESS_STOP,
            () => (this.#requestsProgress = false)
        );
        // if (!Shopify.counter++) {
        //     const shopifyGraphqlAPI = new ShopifyGraphqlAPI(project);
        //     project.apiClient(shopifyGraphqlAPI);
        // }
    }
    async $INIT() {
        this.#storage = await this.#project.storage().dir(this.constructor.name).create();
    }
    async $DETAILS(data, force) {
        if (data) {
            this.#detailsCount++;
            if (force) {
                this.#details = data;
            } else {
                if (!this.#details) return;
                Object.values(this.#details).forEach((props) => {
                    Object.keys(data)
                        .filter(key => key in props && props[key] != data[key])
                        .forEach(key => props[key] = data[key]);
                });
            }
        }
        if (this.#details) {
            coreEvent.emit(
                coreEvent.DETAILS,
                {content: this.#details}
            );
            return this.#details;
        }
        const file = this.#project.storage().dir(this.constructor.name).file('details.json');
        if (file.exists()) {
            this.#details = await file.read();
        } else {
            this.#details = {};
        }
        coreEvent.emit(
            coreEvent.DETAILS,
            {content: this.#details}
        );
        return this.#details;
    }
    async $DESTROY() {
        if (!this.#detailsCount) return;
        const dir = await this.#project.storage().dir(this.constructor.name).create();
        const file = dir.file('details.json');
        await file.write(this.#details);
    }
    project() {
        return this.#project;
    }
    storage(name) {
        if (name) {
            return this.#project.storage().dir(name);
        }
        return this.#storage;
    }
    config() {
        return this.#project.config();
    }
    apiClient() {
        return this.#project.apiClient();
    }
    path(v) {
        return this.#project.path(v); 
    }
    async request(query, variables = {}) {
        try {
            return await this.#project.apiClient().request(query, variables);
        } catch(e) {
            coreEvent.emit(coreEvent.ERROR, e);
        }
    }
    async query(v) {
        /* graphql/ of the project whose code calls the method (see CallStack) */
        const project = CallStack.getProject(this.#project.path('..'));
        return this.#project.query(v, this.project().path(`../${project}`));
    }
    async queryRequest(queryFile, variables = {}) {
        const query = await this.query(join(this.constructor.name, queryFile ))
        try {
            return await this.#project.apiClient().request(query, variables);
        } catch(e) {
            coreEvent.emit(coreEvent.ERROR, e);
        }
    }
    async queryRequestData(queryFile, variables = {}) {
        const query = await this.query(join(this.constructor.name, queryFile ));
        try {
            const result =  await this.#project.apiClient().request(query, variables);
            if (!result) return;
            const data = result.data?.data;
            if (!data) return;
            return Object.values(data)[0];
        } catch(e) {
            coreEvent.emit(coreEvent.ERROR, e);
        }
    }
    async queryRequests(queryFile, variables={}, total=0) {
        if (total <= 0) {
            return [];
        }

        let loadedCount = 0;
        let requestsCount = 0;
        let cursor;

        this.#requestsProgress = true;
        coreEvent.emit(coreEvent.PROGRESS_START);

        const query = await this.query(join(this.constructor.name, queryFile ))
        const list = [];
        try {
            while (this.#requestsProgress) {
                requestsCount++;
                const result = await this.#project.apiClient().request(
                    query, 
                    { cursor, ...variables }
                );
                
                let data = this.#normalize(result);
                if (!data) break;

                loadedCount += data['list'].length;
                list.push(...data['list']);

                cursor = data['cursor'];

                let sleep = 0;
                if (data.balance < data.cost*2) {
                    sleep = data.cost / 50 * 1000;
                }
                
                const percent = Math.ceil(Math.min(((loadedCount/total) * 100), 100));

                coreEvent.emit(coreEvent.PROGRESS, {
                    label: `${queryFile} ${percent} %`,
                    text: `Loaded ${loadedCount}/${total} ( Requests: ${requestsCount} )`,
                    percent: percent,
                    hint: `Cost: ${data.cost} (Balance: ${data.balance})${sleep ? ' sleep for ' + (sleep/1000) + 's' : ''}`
                });

                sleep && await this.#sleep(data.cost / 50 * 1000);
                if (!data.hasNext) break;
            }
        } catch(e) {
            coreEvent.emit(coreEvent.ERROR, e);
        }
        coreEvent.emit(coreEvent.PROGRESS_END);
        this.#requestsProgress = false;
        return list;
    }
    async #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    #normalize(result) {
        const data = result?.data?.data;
        if (!data) return;
        const targetData = Object.values(data)[0];
        if (!targetData) return;
        if (targetData['edges']) {
            let edges = targetData['edges'];
            if (!edges.length) return;
            let cursor = edges[edges.length - 1].cursor;
            let list = edges.map(edge => edge.node);
            let cost = result.data.extensions?.cost?.requestedQueryCost || 0;
            let balance = result.data.extensions?.cost?.throttleStatus?.currentlyAvailable || 0;
            let hasNext = targetData.pageInfo?.hasNextPage
            return {list, cursor, cost, balance, hasNext}
        }
    }

    createShopifyObject(type, data = {}) {
        // return this.#project.apiClient().createShopifyObject(type, data);
        const obj = new ShopifyObject(this.#project, type, data);
        return obj;
    }
}

/* See lib/artiloft/lib/core/Project/ProjectClassHandler.js 
 * For method .#getAllMethods(instance)
 */
Shopify.prototype.$protected = true;