export class ShopifyResponse {
    #response;
    #shopifyObject;
    #data;
    constructor(response, shopifyObject) {
        this.#response = response;
        this.#shopifyObject = shopifyObject;
    }
    shopifyObject(v) {
        return arguments.length ? this.#shopifyObject = v : this.#shopifyObject;
    }
    errors() {
        return this.#response?.data?.errors;
    }
    error() {
        let errors = this.#response?.data?.errors;
        if (!errors) return;
        return errors[0];
    }
    data() {
        const data = this.#response.data?.data;
        if (!data) return;
        const result = Object.entries((data)).reduce((r,[name, itemData]) => {
            if (itemData.edges) {
                r[name] = itemData.edges.map(i => i.node);
            } else if (itemData.nodes) {
                r[name] = itemData.nodes;
            } else {
                r[name] = itemData;
            }
            return r;
        }, {});
        if (Object.keys(result).length < 1) {
            return result;
        }
        return Object.values(result)[0];

    }
    list() {
        const data = this.#response.data?.data;
        if (!data) return;
        const list = Object.entries((data)).reduce((r,[name, itemData]) => {
            if (itemData.edges) {
                r.push(...itemData.edges.map(i => i.node));
            } else if (itemData.nodes) {
                r.push(...itemData.nodes);
            } else {
                r.push(itemData);
            }
            return r;
        }, []);
        if (!this.#shopifyObject) return list;
        return list.map(i => this.#shopifyObject.clone(i));
    }
    map(...keys) {
        return this.list().reduce((r,i) => {
            const key = keys.map(k => i.data()[k]).join('_');
            r[key] = i;
            return r;
        }, {});
    }
    hasNext() {
        const data = this.#response?.data?.data;
        if (!data) return;
        return Object.values(data)[0].pageInfo?.hasNextPage;
    }
    cursor() {
        const data = this.#response?.data?.data;
        if (!data) return;
        const edges = Object.values(data)[0]?.edges;
        return edges[edges.length - 1]?.cursor;
    }
    cost() {
        return this.#response?.data?.extensions?.cost?.requestedQueryCost;
    }
    balance() {
        return this.#response?.data?.extensions?.cost?.throttleStatus.currentlyAvailable;
    }
    sleep() {
        const cost = this.cost();
        const balance = this.balance();
        if (cost && balance < cost * 2) {
            return cost / 50 * 1000;
        }
        return 0;
    }
    objects() {
        const list = this.data();
        if (!list) {
            throw new Error('No list in response');
        }
        return list.map(i => this.#shopifyObject.clone(i));
    }
}