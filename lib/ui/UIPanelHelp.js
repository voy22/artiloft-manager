import blessed from 'blessed';
export class UIPanelHelp extends blessed.list {
    #elements;
    constructor() {
        super({
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            border: null,
        });

        const tableData = ['Help', 'Read', '', '', '', '', '', '', '', ''];
        this.#elements = tableData.map((el, index) => {
            return new UiHelpPanelElement({
                parent: this,
                left: `${index*10}%`,
                width: '10%',
                height: 1,
                value: `F${index+1}`,
                hint: el
            });
        });
    } 
}

export class UiHelpPanelElement extends blessed.box {
    #key;
    #hint;
    constructor(options={}) {
        super(options);

        this.#key = blessed.text({
            parent: this,
            content: (options.value || '').padStart(3),
            height: 1,
            width: 3,
            left: 0,
            style: {
                fg: 'yellow',
                bg: 'gray',
                bold: true,
            }
        });
        this.#hint = blessed.text({
            parent: this,
            content: ' '+(options.hint || 'Hint'),
            height: 1,
            width: '100%-2',
            left: 3,
            style: {
                bg: 'gray',
            }
        });
    }
}