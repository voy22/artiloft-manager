import {basename} from 'path';
import {coreEvent} from '../CoreEvent.js';

export class ProjectClassHandler {
    #path;
    #methods;
    #name;
    #instance;

    async init(pathClass, project) {
        this.#path = pathClass;
        try {
            const module = await import(pathClass);
            this.#name = basename(pathClass, '.js');
            const DynamicClass = module[this.#name];
            const instance = this.#instance = new DynamicClass(project);
            const methods = this.#getAllMethods(DynamicClass)
            if (typeof instance['$INIT'] === 'function') {
                await instance['$INIT'](); 
            }
            this.#methods = methods.filter(method => method[0] !== '$');
            return instance;
        } catch (e) {
            coreEvent.emit(coreEvent.SYS_ERROR, e);
        }
    }

    #getAllMethods(instance) {
        const methods = [];
        let current = instance.prototype;
        while (current && current !== Object.prototype && current !== Function.prototype) {
            let properties = Object.getOwnPropertyNames(current);
            if (properties.indexOf('$protected') >= 0 && current.$protected) {
                break;
            }
            properties
                .filter(prop =>
                    typeof current[prop] === 'function' &&
                    prop !== 'constructor'
                )
                .forEach(method => methods.push(method));
            current = Object.getPrototypeOf(current);
        }
        return methods;
    }
    path() {
        return this.#path
    }
    name() {
        return this.#name
    }
    methods() {
        return this.#methods
    }
    async execute(method, ...args) {
        await this.#instance[method](...args);
        await this.details();
    }

    async details() {
        if (this.#instance['$DETAILS']) {
            return await this.#instance['$DETAILS']();
        }
        return '';
    }
    description() {
        if (this.#instance['$DESCRIPTION']) {
            return this.#instance['$DESCRIPTION']();
        }
        return '';
    }
    methodDescription(methodName) {
        if (this.#instance['$'+methodName]) {
            return this.#instance['$'+methodName]();
        }
        return '';
    }
    async destroy() {
        if (this.#instance['$DESTROY']) {
            return await this.#instance['$DESTROY']();
        }
        return '';        
    }
}