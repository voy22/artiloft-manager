import { commanderUI } from './ui/CommanderUI.js';
import { join, dirname, resolve, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

export class Artiloft {
    constructor(config = {}) {
        this.config = config;
        this.version = '1.1.1';
    }

    /*
     * projectsPath - the folder with the web projects:
     *   - absolute path or file URL (e.g. new URL('../projects', import.meta.url))
     *   - relative path: from the package root (nearest package.json of the cwd)
     */
    async init(projectsPath = 'projects') {
        await commanderUI.init(this.#resolveProjectsPath(projectsPath));
    }

    #resolveProjectsPath(projectsPath) {
        if (projectsPath instanceof URL || String(projectsPath).startsWith('file:')) {
            return fileURLToPath(projectsPath);
        }
        if (isAbsolute(projectsPath)) {
            return projectsPath;
        }
        return join(this.#findProjectRoot(process.cwd()), projectsPath);
    }

    #findProjectRoot(startDir) {
        let current = startDir;
        while (current !== '/') {
            if (existsSync(resolve(current, 'package.json'))) {
                return current;
            }
            current = dirname(current);
        }
        return startDir;
    }
}
