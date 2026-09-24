import blessed from 'blessed';
export class UIPanelHint extends blessed.box {
    #elements;
    constructor() {
        super({
            bottom: 1,
            left: 0,
            width: '100%',
            height: 1,
            border: null,
            content: 'Hint text'
        });
        
    } 
}
