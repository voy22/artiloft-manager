import { coreEvent } from 'artiloft-manager';

/*
 * Demo of the error popup.
 * TODO: demo functionality and comments.
 */
export class Errors {
    $DESCRIPTION() {
        return 'Error handling';
    }

    $emit() {
        return 'Show an error popup';
    }
    async emit() {
        coreEvent.emit(coreEvent.ERROR, new Error('Demo error'));
    }

    $viewer() {
        return 'Show a popup with actions';
    }
    async viewer() {
        coreEvent.emit(coreEvent.VIEWER, {
            label: 'Confirm',
            content: 'Demo popup with actions',
            actions: [
                { label: 'OK', focused: true },
                { label: 'Cancel' },
            ],
        });
    }
}
