import { Shopify, coreEvent } from 'artiloft-manager';

/*
 * Demo of a Shopify web project class.
 * TODO: demo functionality and comments.
 */
export class Shop extends Shopify {
    $DESCRIPTION() {
        return 'Shop settings';
    }

    $info() {
        return 'Show the shop info in the details panel';
    }
    async info() {
        this.$DETAILS({
            'Shop info': {
                url: this.config().url || '- (see config.json.example)',
            }
        }, true);
    }

    $settings() {
        return 'Show config.json in a popup';
    }
    async settings() {
        coreEvent.emit(coreEvent.VIEWER, {
            label: 'config.json',
            content: JSON.stringify(this.config(), null, 4),
        });
    }
}
