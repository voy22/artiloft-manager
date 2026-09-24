import { join, basename, dirname } from 'path';
import { readFile, stat } from 'fs/promises';
import { coreEvent } from '../core/CoreEvent.js';

class GrapfqlQuery {
    #cache;
    constructor() {
        this.#cache = new Map();
    }
    async query(name, path, stack = {}) {
        const cacheKey = join(path, name);
        if (this.#cache.has(cacheKey)) {
            return this.#cache.get(cacheKey);
        }

        if (stack[name]) {
            coreEvent.emit(coreEvent.ERROR, {
                message: `Loop call stack of GrapfqlQuery: ${name}`
            });
            return;
        }
        stack[name]=1;
        let content = await this.#loadFile(name, path);
        const fragmentPattern = /(?:^|\s)+fragment(?:^|\s)*?\{(?:^|\s)*?(\w+)(?:^|\s)*?\}/g;
        if (!content) {
            coreEvent.emit(coreEvent.ERROR, {
                message: `Can't find query-file: ${cacheKey}`
            });
            return;
        }
        const fragmentMatches = [...content.matchAll(fragmentPattern)];
        if (!fragmentMatches.length) {
            return content;
        }
        for (const match of fragmentMatches) {
            const dir = dirname(this.#path(name, path));
            let contentFragment = await this.query(match[1] + '.graphql', dir, {...stack});
            if (typeof contentFragment === 'undefined') return;
            content = content.replace(match[0], ' ' + contentFragment + ' ');
        }
        this.#cache.set(cacheKey, content);
        return content;
    }
    async #loadFile(name, path) {
        const file = this.#path(name, path);
        if (!await this.#exists(file)) {
            coreEvent.emit(coreEvent.ERROR, {
                message: `File not found\n${file}`
            });
            return;
        }
        let content = await readFile(file, 'utf8');
        return content;
    }
    #path(name, path) {
        const fileName = join(dirname(name), `${basename(name, '.graphql')}.graphql`);
        return join(path, fileName);
    }
    async #exists(path) {
        try {
            await stat(path);
            return true;
        } catch (e) {
            if (e.code === 'ENOENT') return false;
            throw e;
        }
    }
}

export const grapfqlQuery = new GrapfqlQuery();