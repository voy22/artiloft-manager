import { ShopifyResponse } from './ShopifyResponse.js';
import { coreEvent } from '../../core/CoreEvent.js';
import { benchmark } from '../../utils/Benchmark.js';
export class ShopifyRequestHandler {
    #query;
    // #apiClient;
    #shopifyObject;
    #cursor;
    #list;
    #totals;
    #count;
    #requests;
    #end;
    #bm;
    constructor(query, shopifyObject, list) {
        this.#query = query;
        // this.#apiClient = apiClient;
        this.#shopifyObject = shopifyObject;
        this.#list = list;
        this.#count = list?.length || 0;
        this.#requests = 0;
    }
    total(v) {
        coreEvent.emit(coreEvent.PROGRESS_START);
        return arguments.length ? this.#totals = v : this.#totals;
    }
    async request() {
        this.#bm ||= benchmark.start();
        if (this.#end) return;
        const r = await this.#shopifyObject.project().apiClient().request(this.#query, {
            cursor: this.#cursor
        }, this.#list ? this.#list[this.#count] : undefined);
        this.#requests++;
        const response = new ShopifyResponse(r, this.#shopifyObject);

        const data = response.data();
        if (!data) {
            coreEvent.emit(coreEvent.PROGRESS_END);
            this.#end = benchmark.finish();
            throw new Error(response.error()?.message || 'No data in the response');
        }

        this.#count += data.length;

        if (this.#totals) {
            const percent = Math.ceil(Math.min(((this.#count/this.#totals) * 100), 100));
            const cost = response.cost();
            const balance = response.balance();

            let sleep = 0;
            if (balance < cost*2) {
                sleep = cost / 50 * 1000;
            }

            coreEvent.emit(coreEvent.PROGRESS, {
                label: `Download ${percent} %`,
                text: `Loaded ${this.#count}/${this.#totals} ( Requests: ${this.#requests} )`,
                percent: percent,
                hint: `Cost: ${cost} (Balance: ${balance})${sleep ? ' sleep for ' + (sleep/1000) + 's' : ''}`
            });
            sleep && await this.sleep(cost / 50 * 1000);
        }

        const hasNext = response.hasNext();
        if (hasNext) {
            this.#cursor = response.cursor();    
        } else {
            coreEvent.emit(coreEvent.PROGRESS_END);
            this.#end = benchmark.finish();
        }
        return response;
    }
    index() {
        return this.#requests;
    }
    benchmark() {
        return this.#end;
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}