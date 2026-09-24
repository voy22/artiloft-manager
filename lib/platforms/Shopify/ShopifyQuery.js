import {basename} from 'path';
export class ShopifyObject {
    #json;
    constructor(json) {
        this.#json = json;
    }
    id() {
        return basename(this.#json['id']);
    }
    json() {
        return this.#json;
    }
}