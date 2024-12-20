import { eventBus } from './eventBus.js';

export class TreeShelfModalPollingUpdateManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('nodeUpdated', this.handleNodeUpdate.bind(this));
    eventBus.on('nodesAdded', this.handleNodesAdded.bind(this));
  }

  handleNodeUpdate({ oldNode, newNode }) {
    // Compare old and new node vote data
    if (oldNode && oldNode.voteCount !== newNode.voteCount) {
        eventBus.emit('voteToggle', { data: newNode });
    }
    // TODO: Handle updating user generated content updates: notes for published texts. 
    // writing and title for unpublished texts (less important... because only the author can see the drafts--for now... but I can imagine a future where the author can share drafts with others)
    // Replace the text content of a currently visible node (shelf view and modal view)
    if (oldNode && ['note', 'writing', 'title'].some(prop => oldNode[prop] !== newNode[prop])) {
        // Create an object containing only the changed properties
        const changes = {
            id: newNode.id,
            changes: {}
        };
        
        ['note', 'writing', 'title'].forEach(prop => {
            if (oldNode[prop] !== newNode[prop]) {
                changes.changes[prop] = newNode[prop];
                // Check if the property has a corresponding date
                if (prop === 'note') {
                    changes.changes.note_date = newNode.note_date;
                } else if (prop === 'writing') {
                    changes.changes.date = newNode.date;
                }
            }
        });
        
        eventBus.emit('nodeTextContentUpdate', { data: changes });
    }
    // TODO: you need a whole flow for updates on search results. 
  }

  handleNodesAdded(nodes) {
    // Ensure nodes have children arrays
    const normalizedNodes = nodes.map(node => ({
        ...node,
        children: node.children || []
    }));
    eventBus.emit('newNodesDiscovered', normalizedNodes);
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