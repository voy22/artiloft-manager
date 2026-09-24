import { coreEvent } from 'artiloft-manager';

/*
 * Demo of a web project class without a platform: any class can be listed by the shell.
 * TODO: demo functionality and comments.
 */
export class Pages {
    #project;

    constructor(project) {
        this.#project = project;
    }

    $DESCRIPTION() {
        return 'Pages of the site';
    }

    async $DETAILS() {
        coreEvent.emit(coreEvent.DETAILS, {
            content: { Project: { name: this.#project.name() } }
        });
    }

    $download() {
        return 'Download the pages (progress demo)';
    }
    async download() {
        coreEvent.emit(coreEvent.PROGRESS_START);
        for (let i = 1; i <= 10; i++) {
            coreEvent.emit(coreEvent.PROGRESS, {
                label: 'Download',
                text: `Page ${i}/10`,
                percent: [i, 10],
            });
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        coreEvent.emit(coreEvent.PROGRESS_END);
    }

    $clean() {
        return 'Remove the downloaded pages';
    }
    async clean() {
        await this.#project.storage().dir('Pages').remove();
    }
}
