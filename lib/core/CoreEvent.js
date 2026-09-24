import {EventEmitter} from 'events';
/*
  EventBus.emit(Events.ITEM_SELECTED, {
    item: selectedItem,
    index: index,
    timestamp: Date.now(),
    listId: this.id || 'mainList'
  });

  EventBus.on(
    Events.ITEM_SELECTED, 
    data=>this.updateSelectedItem(data)
  );
  
*/
class CoreEvent extends EventEmitter {
  static names = {
    PROJECT_SELECTED: 'PROJECT_SELECTED',
    PROJECT_SET: 'PROJECT_SET',
    PROJECT_FIRST: 'PROJECT_FIRST',
    PROJECT_LAST: 'PROJECT_LAST',
    ERROR: 'ERROR',
    SYS_ERROR: 'SYS_ERROR',
    PROGRESS_START: 'PROGRESS_START',
    PROGRESS: 'PROGRESS',
    PROGRESS_STOP: 'PROGRESS_STOP',
    PROGRESS_END: 'PROGRESS_END',
    DETAILS: 'DETAILS',
    VIEWER: 'VIEWER',
    EXIT: 'EXIT',
  }
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}
export const coreEvent = new CoreEvent();
Object.assign(coreEvent, CoreEvent.names);