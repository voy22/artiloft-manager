import { Shopify, coreEvent } from 'artiloft-manager';

/*
 * Demo of a Shopify web project class.
 * TODO: demo functionality and comments.
 */
export class Products extends Shopify {
    $DESCRIPTION() {
        return 'Products operations';
    }

    $count() {
        return 'Count the products';
    }
    async count() {
        this.$DETAILS({ Products: { count: 0 } }, true);
    }

    $list() {
        return 'Show the products in a popup';
    }
    async list() {
        coreEvent.emit(coreEvent.VIEWER, {
            label: 'Products',
            content: { 'Demo product': { title: 'Pencil', price: '1.00 CHF' } },
        });
    }
}
