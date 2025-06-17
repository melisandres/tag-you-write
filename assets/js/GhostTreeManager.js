export class GhostTreeManager {
    constructor() {
        console.log('GhostTreeManager: Initializing');
        // Expose singleton for convenience
        window.ghostTreeManager = this;
    }

    /**
     * Return a NEW hierarchy that contains ghost nodes for each iterating activity.
     * Used primarily for initialization or full tree updates.
     */
    enrichTreeWithGhosts(treeData, activities = []) {
        console.log('GhostTreeManager: enrichTreeWithGhosts called', { treeData, activities });
        if (!treeData) return null;

        // Extract the actual tree data (handle wrapped format)
        const actualTreeData = treeData.data || treeData;

        // Deep-clone the hierarchy so the original remains untouched
        const clone = GhostTreeManager._deepClone(actualTreeData);

        // Always start by removing any existing ghost nodes (they are purely ephemeral)
        this._pruneGhostNodes(clone);

        // Filter only iterating activities that have parent_id
        const iteratingActivities = activities.filter(a => a.activity_type === 'iterating' && a.parent_id);
        console.log('GhostTreeManager: Filtered iterating activities', iteratingActivities);

        iteratingActivities.forEach(activity => {
            // Only add a ghost if a REAL node with text_id is not already present
            if (!this._nodeExists(clone, String(activity.text_id))) {
                this._insertGhostNode(clone, activity);
            }
        });

        return clone;
    }

    /**
     * Add a single ghost node to the tree for a specific activity.
     * Returns the modified tree if the node was added, null if it already exists or couldn't be added.
     */
    addGhostNode(treeData, activity) {
        console.log('GhostTreeManager: addGhostNode called', { treeData, activity });
        if (!treeData || !activity || activity.activity_type !== 'iterating' || !activity.parent_id) {
            console.warn('GhostTreeManager: Invalid parameters for addGhostNode');
            return null;
        }

        // Extract the actual tree data (handle wrapped format)
        const actualTreeData = treeData.data || treeData;
        
        // Deep clone the tree to avoid modifying the original
        const modifiedTree = GhostTreeManager._deepClone(actualTreeData);

        // Check if a real node with this ID already exists
        if (this._nodeExists(modifiedTree, String(activity.text_id))) {
            console.log('GhostTreeManager: Real node already exists');
            return null;
        }

        // Check if a ghost node for this activity already exists
        if (this._findGhostNode(modifiedTree, String(activity.text_id))) {
            console.log('GhostTreeManager: Ghost node already exists');
            return null;
        }

        // Insert the ghost node
        const success = this._insertGhostNode(modifiedTree, activity);
        console.log('GhostTreeManager: Ghost node insertion result', success);
        return success ? modifiedTree : null;
    }

    /**
     * Remove a specific ghost node from the tree.
     * Returns the modified tree if the node was removed, null if it wasn't found.
     */
    removeGhostNode(treeData, textId) {
        if (!treeData || !textId) return null;

        // Extract the actual tree data (handle wrapped format)
        const actualTreeData = treeData.data || treeData;

        // Deep clone the tree to avoid modifying the original
        const modifiedTree = GhostTreeManager._deepClone(actualTreeData);
        const normalizedId = String(textId);
        const ghostId = `ghost-${normalizedId}`;

        // Helper function to remove ghost node from children array
        const removeFromChildren = (node) => {
            if (!node.children) return false;
            
            const initialLength = node.children.length;
            node.children = node.children.filter(child => child.id !== ghostId);
            
            if (node.children.length !== initialLength) {
                return true; // Node was removed
            }
            
            // Recursively check children
            return node.children.some(child => removeFromChildren(child));
        };

        const wasRemoved = removeFromChildren(modifiedTree);
        return wasRemoved ? modifiedTree : null;
    }

    /**
     * Find a specific ghost node in the tree.
     * Returns the ghost node if found, null otherwise.
     */
    _findGhostNode(node, textId) {
        const ghostId = `ghost-${textId}`;
        
        if (node.id === ghostId && node.isGhost) {
            return node;
        }
        
        if (!node.children) return null;
        
        for (let child of node.children) {
            const found = this._findGhostNode(child, textId);
            if (found) return found;
        }
        
        return null;
    }

    /* ======================== INTERNAL UTILS ======================== */

    /** Deep clone via JSON – hierarchy only contains data primitives & arrays */
    static _deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /** Recursively remove nodes that were previously tagged as ghosts */
    _pruneGhostNodes(node) {
        if (!node || !node.children) return;
        node.children = node.children.filter(child => !child.isGhost);
        node.children.forEach(child => this._pruneGhostNodes(child));
    }

    /** Recursively check if a node with given id already exists (real node only) */
    _nodeExists(node, id) {
        if (String(node.id) === String(id) && !node.isGhost) return true;
        if (!node.children) return false;
        return node.children.some(child => this._nodeExists(child, id));
    }

    /** Insert a ghost node as a direct child of parent_id */
    _insertGhostNode(node, activity) {
        if (String(node.id) === String(activity.parent_id)) {
            node.children = node.children || [];
            node.children.push(this._createGhostNode(activity));
            return true; // inserted
        }
        if (!node.children) return false;
        for (let child of node.children) {
            if (this._insertGhostNode(child, activity)) return true;
        }
        return false;
    }

    /** Build the ghost node object */
    _createGhostNode(activity) {
        const title = (window.i18n ? window.i18n.translate('tree.ghost_title') : 'Someone is writing…');
        const lastName = (window.i18n ? window.i18n.translate('tree.ghost_last_name') : 'Someone');
        return {
            id: `ghost-${activity.text_id}`,     // ensure uniqueness vs real node id
            isGhost: true,
            ghostFor: String(activity.text_id),
            writer_id: String(activity.user_id),
            parent_id: String(activity.parent_id),
            title: title,
            text_status: 'ghost',               // optional flag for styling
            text_seen: 0,                       // Ghost nodes are always "unread"
            voteCount: 0,                       // Ghost nodes have no votes
            isWinner: false,                    // Ghost nodes are never winners
            firstName: '',               // Default name for display
            lastName: lastName,
            permissions: {                      // Default permissions for ghost nodes
                canEdit: false,
                canAddNote: false,
                canDelete: false,
                canIterate: false,
                canPublish: false,
                canVote: false,
                isMyText: false
            },
            children: []                        // always terminal
        };
    }
}

