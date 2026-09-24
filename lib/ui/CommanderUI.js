import { projectManager } from '../core/ProjectManager.js';
import { UIScreen } from './UIScreen.js';
import { UIPanelProjects } from './UIPanelProjects.js';
import { UIPanelDetails } from './UIPanelDetails.js';
import { UIPanelHelp } from './UIPanelHelp.js';
import { UIPanelHint } from './UIPanelHint.js';
import { UIPopupError } from './UIPopupError.js';
import { UIPopupProgress } from './UIPopupProgress.js';
import { UIPopupViewer } from './UIPopupViewer.js';
import { coreEvent } from '../core/CoreEvent.js'

export class CommanderUI {
    #screen;
    #projectPanel;
    #detailsPanel;
    #helpPanel;
    #hintPanel;
    #errorPopup;
    #progressPopup;
    #viewerPopup;
    #projectsPath;
    #stack;
    #level;

    async init(projectsPath) {
        this.#stack = [];
        this.#projectsPath = projectsPath;
        this.initUI();
        await projectManager.load(this.#projectsPath);
        this.displayProjects();
        this.#projectPanel.focus();
        this.#screen.render();
    }

    initUI() {
        this.#screen = new UIScreen();
        this.#screen.append(this.#projectPanel = new UIPanelProjects());
        this.#screen.append(this.#detailsPanel = new UIPanelDetails());
        this.#screen.append(this.#helpPanel = new UIPanelHelp());
        this.#screen.append(this.#hintPanel = new UIPanelHint());

        this.#screen.append(this.#errorPopup = new UIPopupError());
        this.#screen.append(this.#progressPopup = new UIPopupProgress());
        this.#screen.append(this.#viewerPopup = new UIPopupViewer());
        this.initEvents();
    }

    initEvents() {
        this.#screen.key(['tab', 'S-tab'], () => {
            if (!this.#viewerPopup.hidden) return;
            if (this.#screen.focused === this.#detailsPanel) {
                this.#projectPanel.focus();
            } else {
                this.#detailsPanel.focus();
            }
            this.#screen.render();
        });

        coreEvent.on(
            coreEvent.PROJECT_SELECTED,
            async data => await this.selected(data)
        );
        coreEvent.on(
            coreEvent.PROJECT_SET,
            async data => await this.set(data)
        );
        coreEvent.on(
            coreEvent.PROJECT_FIRST,
            data => this.#screen.render()
        );
        coreEvent.on(
            coreEvent.PROJECT_LAST,
            data => this.#screen.render()
        );
    }

    async selected(data) {
        let parent = this.#projectPanel.currentLabel() === '..';
        let level = this.#stack.length;

        this.#hintPanel.hide();
        if (parent) {
            level === 1 && this.#detailsPanel.setContent('');
            return;
        };

        if (level === 0) {
            // Display project description
        } else if (level === 1) {
            this.#detailsPanel.setContent('');
            await this.displayClassDescription();
        } else if (level === 2 && this.#level != 2) {
            this.displayMethodDescription(this.#projectPanel.currentLabel());
        }
        this.#level = level;
    }

    /* Set: Project, Class or Method */
    async set() {
        let level = this.#stack.length;

        level < 2 && this.#detailsPanel.setContent('');
        let parent = this.#projectPanel.currentLabel() === '..';

        if (parent) {
            let parentLabel = this.#stack.pop();
            if (level === 2) {
                await this.displayClasses(parentLabel);
                await this.displayClassDescription(parentLabel);
            } else if (level === 1) {
                this.displayProjects(parentLabel);
            }
            const parts = ['Projects', ...this.#stack];
            this.#projectPanel.setLabel(` {bold}${parts.join(' / ')}{/bold} `);
            this.#screen.render();
            return;
        }
        if (level === 0) {
            this.#stack.push(this.#projectPanel.currentLabel());
            await this.displayClasses();

        } else if (level === 1) {
            this.#stack.push(this.#projectPanel.currentLabel());
            await this.displayMethods();

        } else if (level === 2) {
            await this.executeMethods(this.#projectPanel.currentLabel());
        }

        const parts = ['Projects', ...this.#stack];
        this.#projectPanel.setLabel(` {bold}${parts.join(' / ')}{/bold} `);
        this.#screen.render();
    }

    displayProjects(parentLabel) {
        this.#projectPanel.setItems(projectManager.names());
        if (projectManager.length() > 0) {
            if (parentLabel) {
                this.#projectPanel.select(projectManager.findIndex(parentLabel));
            } else {
                this.#projectPanel.select(0);
            }
        }
    }
    
    async displayClasses(parentLabel) {
        const currentProject = projectManager.find(this.#stack[0]);
        const classes = await currentProject.classes() || [];
        this.#projectPanel.setItems(['..', ...classes]);
        if (parentLabel) {
            this.#projectPanel.select(classes.indexOf(parentLabel) + 1);
            await this.displayClassDescription();
        } else {
            this.#projectPanel.select(0);
        }
    }

    async displayClassDescription(classLabel) {
        const currentProject = projectManager.find(this.#stack[0]);
        const currentClassHandler = currentProject.getClass(classLabel || this.#projectPanel.currentLabel());
        if (!currentClassHandler) {
            debugger;
        }
        await currentClassHandler.details();
        const description = currentClassHandler.description();
        this.#hintPanel.setContent(description);
        description && this.#hintPanel.show();
    }

    async displayMethods() {
        const currentProject = projectManager.find(this.#stack[0]);
        const currentClassHandler = currentProject.getClass(this.#stack[1]);
        await currentClassHandler.details();
        this.#projectPanel.setItems(['..', ...currentClassHandler.methods()]);
        this.#projectPanel.select(0);
    }

    async executeMethods(method) {
        const currentProject = projectManager.find(this.#stack[0]);
        const currentClassHandler = currentProject.getClass(this.#stack[1]);
        await currentClassHandler.execute(method);
        this.#detailsPanel.screen.render();
    }

    displayMethodDescription(method) {
        const currentProject = projectManager.find(this.#stack[0]);
        const currentClassHandler = currentProject.getClass(this.#stack[1]);
        const description = currentClassHandler.methodDescription(method);
        this.#hintPanel.setContent(description);
        description && this.#hintPanel.show();
    }

}
export const commanderUI = new CommanderUI();