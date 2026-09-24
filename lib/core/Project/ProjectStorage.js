import {readdir, readFile, stat, mkdir, writeFile, rm} from 'fs/promises';
import {join, extname, basename} from 'path';

export class ProjectStorage {
    #path;
    #stat;
    #isFile;

    constructor(_path, isFile = false) {
        this.#path = _path;
        this.#isFile = isFile;
    }

    path() {
        return this.#path;
    }

    dir(v) {
        if (v) {
            return new ProjectStorage(join(this.#path, v));
        }
        if (this.#isFile) {
            return basename(this.#path);
        }
        return this.#path;
    }
    async createDir(v) {
        return await this.dir(v, true).create();
    }

    file(v) {
        if (v) {
            return new ProjectStorage(join(this.#path, v), true);
        }
        return this.#path;
    }

    async create() {
        if (this.#isFile) {
            await writeFile(this.#path, '');
        } else {
            const stat = await this.stat();
            if (!stat) {
                await mkdir(this.#path, { recursive: true });
            }
        }
        return this;
    }

    async read() {
        if (!(await this.stat())) return;
        if (this.#stat.isFile()) {
            const content = await readFile(this.#path);
            if (!content.length) {
                return;
            }
            if (extname(this.#path).toLowerCase() === '.json') {
                return JSON.parse( content );    
            }
            return content;
        }
        if (this.#stat.isDirectory()) {
            const files = await readdir(this.#path, { withFileTypes: true });
            return files.filter(file => file.isFile());
        }
    }

    async write(content = '') {
        if (!this.#isFile) {
            throw new Error('write() possible for file only');
        }
        if (content.constructor === String) {
            await writeFile(this.#path, content);    
        } else {
            await writeFile(this.#path, JSON.stringify(content));
        }
        this.#stat = undefined;
        return this;
    }

    async remove() {
        if (!(await this.stat())) return;
        if (this.#stat.isFile()) {
            await rm(this.#path, { force: true });
            this.#stat = undefined;
        } else if (this.#stat.isDirectory()) {
            await rm(this.#path, { recursive: true, force: true });
            this.#stat = undefined;
        }
    }

    async clean() {
        if (!(await this.stat())) return;
        if (this.#stat.isFile()) {
            await this.write('');
            this.#stat = undefined;
        } else if (this.#stat.isDirectory()) {
            const files = await readdir(this.#path, { withFileTypes: true });
            for (const file of files) {
                const fullPath = join(this.#path, file.name);
                if (file.isDirectory()) {
                    await rm(fullPath, { recursive: true, force: true });
                } else {
                    await rm(fullPath, { force: true });
                }
            }
            this.#stat = undefined;
        }
        return this;
    }

    /*
     *  object support .id() and .json()
     *  see class ShopifyObject
     */
    // async save(object) {
    //     const dir = await this.dir(object.constructor.name).create();
    //     const file = object.id() + '.json';
    //     dir.file(file).write(object.json());
    // }

    async stat() {
        if (!this.#stat) {
            try {
                this.#stat = await stat(this.#path);
            } catch(e) {
                return;
            }
        }
        return this.#stat;
    }
    async exists() {
        return await this.stat();
    }
}