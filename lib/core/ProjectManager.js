import { readdirSync } from 'fs';
import { join } from 'path';
import { Project } from './Project.js';
import { coreEvent } from './CoreEvent.js';

export class ProjectManager {
    #projects;
    #currentProject

    constructor() {
        this.#projects = [];
        this.#currentProject = null;
        coreEvent.on(
            coreEvent.EXIT,
            async data => await this.exit(data)
        );
    }


    async load(projectsPath) {
        try {
            const projectDirs = readdirSync(projectsPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => join(projectsPath, dirent.name));

            for (const projectDir of projectDirs) {
                const project = new Project(projectDir);
                //await project.loadPlatform();
                this.#projects.push(project);
            }
            return this.#projects;

        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
    }
    names() {
        return this.#projects.map(p => p.name())
    }
    get(index) {
        return this.#projects[index];
    }
    current(index) {
        return arguments.length ?
            (this.#currentProject = this.#projects[index]) :
            this.#currentProject;
    }
    findIndex(name) {
        return this.#projects.findIndex(p => p.name() === name);
    }
    find(name) {
        return this.#projects.find(p => p.name() === name);
    }
    length() {
        return this.#projects.length;
    }
    async exit() {
        for (const project of this.#projects) {
            await project.exit();
        }
        process.exit(0);
    }
}
export const projectManager = new ProjectManager();