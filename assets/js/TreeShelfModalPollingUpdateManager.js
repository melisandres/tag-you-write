import { eventBus } from './eventBus.js';

export class TreeShelfModalPollingUpdateManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('nodeUpdated', this.handleNodeUpdate.bind(this));
  }

  handleNodeUpdate({ oldNode, newNode }) {
    // Add playerCountMinusOne to the newNode
    /* newNode.playerCountMinusOne = newNode.playerCount - 1; */

    // Compare old and new node data
    if (oldNode && oldNode.voteCount !== newNode.voteCount) {
        console.log('voteToggle', { data: newNode } );
        eventBus.emit('voteToggle', { data: newNode } );
    }
    console.log("done");
  }


/*   getCurrentViews() {
    // Extract the 'showcase' parameter from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const showcase = urlParams.get('showcase');
  
    // Check if the modal is visible
    const isModalVisible = document.querySelector('.modal-background[data-tree-modal="visible"]') !== null;
  
    if (isModalVisible) {
      return 'modal';
    }

    return {
        modal: isModalVisible,
        showcase: showcase === 'tree' || showcase === 'shelf' ? showcase : null
    }
  } */
}