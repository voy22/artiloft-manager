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
                /* a method overridden in a child class is listed once */
                .filter(method => !methods.includes(method))
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
        try {
            await this.#instance[method](...args);
            await this.details();
        } catch (e) {
            /* an exception of a method is shown in the error popup */
            coreEvent.emit(coreEvent.ERROR, e);
        }
    }

    async details() {
        if (this.#instance['$DETAILS']) {
            try {
                return await this.#instance['$DETAILS']();
            } catch (e) {
                coreEvent.emit(coreEvent.ERROR, e);
            }
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