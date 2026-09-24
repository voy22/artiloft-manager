import {relative} from 'path';
export class CallStack {
    static getProject(projectsFolder) {
        const error = new Error();
        const stack = error.stack;
        const stackLines = stack.split('\n').slice(1);
        // const projectsPath = this.project().path('..');

        const reg = /at\s+(.+?)\s+\(file:\/\/(.+?)\:\d+:\d+\)/;
        for (const line of stackLines) {
            const match = line.match(reg);
            if (!match) continue;
            const filePath = match[2];
            const relativePath = relative(projectsFolder, filePath);
            const project = relativePath.split('/');
            if (project[0] === '..') continue;
            return project[0];
        }        
    }
}
