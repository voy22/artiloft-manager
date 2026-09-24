import axios from 'axios';

export class ProjectApiClient {
    /* a productCreate with media needs much more than the few seconds of a read */
    static TIMEOUT = 60000;
    static RETRIES = 3;

    #client;
    #pathname;
    #retries;
    constructor(config) {
        if (config && config.token && config.url) {
            const url = new URL(config.url);
            this.#pathname = url.pathname;
            this.#retries = config.retries ?? ProjectApiClient.RETRIES;
            this.#client = axios.create({
                baseURL: `${url.protocol}//${url.host}`,
                timeout: config.timeout ?? ProjectApiClient.TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': config.token,
                }
            });
        }
    }
    async request(query, variables, context) {
        if (context) {
            query = this.#parse(query, context);
        }
        const response = await this.#post(query, variables);
        // let cost = response.data?.extensions?.cost;
        // if (cost) {
        //     if ((cost.requestedQueryCost*2) > cost.throttleStatus.currentlyAvailable) {
        //         await this.sleep(2000);
        //         this.sleep = data.cost / 50 * 1000;
        //     }
        // }
        return response;
    }

    /*
     * A timeout or a broken connection is repeated for the reads only:
     * a mutation may have reached the shop and must not be sent twice.
     */
    async #post(query, variables) {
        /* the leading comments of the graphql files are skipped */
        const operation = query.replace(/^(?:\s*#[^\n]*\n)*\s*/, '');
        const repeatable = !/^mutation\b/.test(operation);
        const attempts = repeatable ? this.#retries : 1;

        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await this.#client.post(this.#pathname, { query, variables });
            } catch (e) {
                lastError = e;
                const transient = e.code === 'ECONNABORTED'   /* timeout */
                    || e.code === 'ECONNRESET'
                    || e.code === 'ETIMEDOUT'
                    || e.code === 'EAI_AGAIN'
                    || (e.response && e.response.status >= 500);
                if (!transient || attempt === attempts) throw e;
                await this.#sleep(1000 * attempt);
            }
        }
        throw lastError;
    }

    #parse(template, data) {
        return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
            try {
                // Разбираем путь типа "user.address.city"
                const value = path.split('.').reduce((obj, key) => {
                    return obj && obj[key] !== undefined ? obj[key] : undefined;
                }, data);
                
                if (value !== undefined) {
                    return value;
                }
                return match;
            } catch (e) {
                return match;
            }
        });
    }
    
    // #normalizeError(error) {
    //     if (error.response) {
    //         /* Shopify API ошибка */
    //         return {
    //             message: error.response.data?.errors?.[0]?.message || 'Shopify API error',
    //             status: error.response.status,
    //             details: error.response.data,
    //             retryable: error.response.status >= 500
    //         };
    //     }
    //     return error;
    // }
    async #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
