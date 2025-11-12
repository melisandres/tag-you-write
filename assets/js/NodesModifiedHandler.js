import { eventBus } from './eventBus.js';

export class NodesModifiedHandler {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('nodeUpdated', this.handleNodeUpdate.bind(this));
    eventBus.on('nodesAdded', this.handleNodesAdded.bind(this));
    eventBus.on('treeFullyUpdated', this.handleTreeFullyUpdated.bind(this));
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
        console.log("changes", changes);
        eventBus.emit('nodeTextContentUpdate', { data: changes });
    }
    // TODO: you need a whole flow for updates on search results. 

    // Check if winner status or permissions have changed
    if (oldNode?.isWinner !== newNode?.isWinner ||
        JSON.stringify(oldNode?.permissions) !== JSON.stringify(newNode?.permissions)) {
        console.log('Winner status or permissions changed:', {
            oldIsWinner: oldNode?.isWinner,
            newIsWinner: newNode?.isWinner,
            oldPermissions: oldNode?.permissions,
            newPermissions: newNode?.permissions
        });
        
        // Split the logic: emit different events based on what changed
        if (oldNode?.isWinner !== newNode?.isWinner && newNode?.isWinner) {
            // Only emit updateNodeWinner if it's actually becoming a winner
            eventBus.emit('updateNodeWinner', { textId: newNode.id, data: newNode });
        } else if (JSON.stringify(oldNode?.permissions) !== JSON.stringify(newNode?.permissions)) {
            console.log('nodePermissionsChanged', { textId: newNode.id, data: newNode });
            // Emit a more appropriate event for permission changes
            eventBus.emit('nodePermissionsChanged', { textId: newNode.id, data: newNode });
        }
    }
  }

  handleNodesAdded(nodes) {
    // Ensure nodes have children arrays
    const normalizedNodes = nodes.map(node => ({
        ...node,
        children: node.children || []
    }));
    eventBus.emit('newNodesDiscovered', normalizedNodes);
  }

  handleTreeFullyUpdated({ oldTree, newTree }) {
    console.log('Processing full tree update');
    
    // Helper function to flatten tree into array of nodes
    const flattenTree = (node, nodes = []) => {
      if (!node) return nodes;
      nodes.push(node);
      if (node.children) {
        node.children.forEach(child => flattenTree(child, nodes));
      }
      return nodes;
    };

    // Get arrays of nodes from both trees
    const oldNodes = oldTree ? flattenTree(oldTree) : [];
    const newNodes = flattenTree(newTree);

    // Create a map of old nodes for quick lookup
    const oldNodesMap = new Map(oldNodes.map(node => [node.id, node]));

    // Process each new node
    newNodes.forEach(newNode => {
      const oldNode = oldNodesMap.get(newNode.id);
      
      // If node exists in old tree, compare and update if needed
      if (oldNode) {
        console.log('oldNode', oldNode);
        console.log('newNode', newNode);
        // Process if permissions OR winner status have changed
        const permissionsChanged = JSON.stringify(oldNode.permissions) !== JSON.stringify(newNode.permissions);
        const winnerStatusChanged = oldNode.isWinner !== newNode.isWinner;
        
        if (permissionsChanged || winnerStatusChanged) {
          this.handleNodeUpdate({ oldNode, newNode });
        }
      } else {
        // New node discovered
        this.handleNodesAdded([newNode]);
      }
    });

    // Check for nodes that were removed
    const newNodesMap = new Map(newNodes.map(node => [node.id, node]));
    oldNodes.forEach(oldNode => {
      if (!newNodesMap.has(oldNode.id)) {
        // Node was removed - handle if needed
        console.log(`Node ${oldNode.id} was removed from tree`);
      }
    });
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