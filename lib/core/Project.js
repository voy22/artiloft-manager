import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { coreEvent } from './CoreEvent.js';

import { ProjectStorage } from './Project/ProjectStorage.js';
import { ProjectClassHandler } from './Project/ProjectClassHandler.js';
import { ProjectApiClient } from './Project/ProjectApiClient.js';
import { grapfqlQuery } from '../utils/GrapfqlQuery.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export class Project {
    #name;
    #config;
    #path;
    #loadedClasses;
    #client;
    #storage;

    constructor(projectPath) {
        this.#path = projectPath;
        this.#name = basename(projectPath);
        this.#config = {};
        //this.#shopifyODM = new ShopifyGraphqlAPI();
    }
    async #loadPlatform() {
        try {
            const configPath = join(this.#path, 'config.json');
            if (await this.#exists(configPath)) {
                this.config(JSON.parse(await readFile(configPath, 'utf8')));
            }

            const libPath = join(this.#path, 'lib');
            if (!await this.#exists(libPath)) {
                return;
            }

            const files = (await readdir(libPath))
                .filter(file => file.endsWith('.js'))

            const loadedClasses = {};
            for (const file of files) {
                const projectClassHandler = new ProjectClassHandler();
                const instance = await projectClassHandler.init(join(libPath, file), this);
                /* a class that failed to load is reported by SYS_ERROR and not listed */
                if (!instance) continue;
                loadedClasses[projectClassHandler.name()] = projectClassHandler;
            }
            return loadedClasses;
        } catch (error) {
            // Error loading platform for ${this.#name}
            coreEvent.emit(coreEvent.SYS_ERROR, error);
        }
    }
    name() {
        return this.#name;
    }
    async classes() {
        this.#loadedClasses ||= await this.#loadPlatform();
        if (!this.#loadedClasses) return;
        return Object.keys(this.#loadedClasses);
    }
    path(v) {
        if (v) {
            return join(this.#path, v);
        }
        return this.#path;
    }
    getClass(className) {
        return this.#loadedClasses[className];
    }
    config(v) {
        return arguments.length ? this.#config = v : this.#config;
    }
    apiClient(v) {
        if (v) {
            this.#client = v;    
        }
        this.#client ||= new ProjectApiClient(this.#config);
        return this.#client;
    }
    storage() {
        this.#storage ||= (new ProjectStorage(this.#path)).dir('json');
        return this.#storage;
    }
    async query(name, projectPath) {
        const graphqlPath = join(projectPath || this.path(), 'graphql');
        return await grapfqlQuery.query(name, graphqlPath);
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

    async exit() {
        if (!this.#loadedClasses) return;
        for (const loadedClass of Object.values(this.#loadedClasses)) {
            await loadedClass.destroy();
        }
    }
}

