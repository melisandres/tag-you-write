export class DataManager {
    static instance = null;
    
    static getInstance(path) {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager(path);
        }
        return DataManager.instance;
    }
    constructor(path) {
        if (DataManager.instance) {
            return DataManager.instance;
        }

        this.currentViewedRootStoryId = null;
        const userIdMeta = document.querySelector('meta[name="user"]');
        this.path = path;
        this.cache = this.loadCache() || {
            games: new Map(),
            trees: new Map(),
            nodesMap: new Map(), // A flat structure to make updates easier
            lastGamesCheck: null,
            lastUserId: userIdMeta.getAttribute('data-user-id') !== 'null' ? userIdMeta.getAttribute('data-user-id') : null,
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0
            },
            filters: {
                hasContributed: null,  // null = all, 'contributor', 'mine'
                gameState: 'all',  // 'all', 'open', 'closed', 'pending'
                // FUTURE:
                // Bookmarked: 'bookmarked', 'unbookmarked', all? 
                // sort: 'newest',   // 'newest', 'oldest', etc.
                // search: ''        // search term
            },
        };

        // Ensure nodesMap exists even if loaded from cache
        if (!this.cache.nodesMap) {
            this.cache.nodesMap = new Map();
        }

        this.currentUserId = null; // Track current user
        this.recentlyModifiedGames = new Set(); // Track modified game IDs
        this.treeChecks = new Map(); // Store last check time for each tree

        // Subscribe to relevant events
        eventBus.on('requestGameData', (gameId) => {
            const gameData = this.cache.games.get(gameId)?.data;
            eventBus.emit('gameDataResponse', { gameId, data: gameData });
        });

        // update the data cache with passed parameter
        eventBus.on('updateGame', (gameData) => {
            this.updateGamesData([gameData]);
        });
        
        this.saveCache();
        DataManager.instance = this;
        //this.clearCache();
    }

    setCurrentViewedRootStoryId(rootStoryId) {
        this.currentViewedRootStoryId = rootStoryId;
        
        // Ensure tree exists in cache
        if (!this.cache.trees.has(rootStoryId)) {
            this.cache.trees.set(rootStoryId, {
                data: null,  // Will be populated by setFullTree later
                timestamp: Date.now()
            });
        }
    }

    getCurrentViewedRootStoryId() {
        return this.currentViewedRootStoryId;
    }

    getInitialCache() {
        return {
            games: new Map(),
            trees: new Map(),
            nodesMap: new Map(),
            lastGamesCheck: Date.now(),
            lastUserId: null,
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0
            },
            filters: {
                hasContributed: null,
                gameState: 'all'
            }
        };
    }

    setCurrentUser(userId) {
        if (this.cache.lastUserId !== userId) {
            // Clear cache if user changed
            this.clearCache();
            this.cache.lastUserId = userId;
            this.saveCache();
        }
        this.currentUserId = userId;
    }

    // Add method to check if games need refresh
    async checkForUpdates() {
        if (!navigator.onLine) {
            console.log('Browser is offline, skipping update check');
            return false;
        }

        const rootId = this.currentViewedRootStoryId;
        const lastGamesCheck = this.cache.lastGamesCheck || 0;
        
        console.log('Checking for updates with:', {
            currentViewedRootStoryId: this.currentViewedRootStoryId,
            lastGamesCheck: new Date(lastGamesCheck).toISOString(),
            treeTimestamp: this.cache.trees.get(rootId)?.timestamp
        });

        try {
            const response = await fetch(`${this.path}game/modifiedSince`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lastGamesCheck: lastGamesCheck,
                    filters: this.cache.filters || {},
                    rootStoryId: rootId,
                    lastTreeCheck: this.cache.trees.get(rootId)?.timestamp || 0
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const modifiedData = await response.json();
            console.log('Modified data:', modifiedData);
            return this.handleUpdateResponse(modifiedData, rootId);
        } catch (error) {
            console.error('Error checking for updates:', error);
            return false;
        }
    }

    setCurrentViewedRootStoryId(rootStoryId) {
        this.currentViewedRootStoryId = rootStoryId;
    }

    // This creates the recently modified games list
    handleUpdateResponse(response, currentlyViewedRootId) {
        const { modifiedGames, modifiedNodes } = response;
        let hasUpdates = false;
        let hasTreeUpdates = false;

        if (modifiedGames?.length > 0) {
            this.updateGamesData(modifiedGames, false);
            // this event refreshes the view in gameListRenderer.js
            eventBus.emit('gamesModified', modifiedGames);
            hasUpdates = true;
        }

        if (modifiedNodes?.length > 0) {
            this.updateTreeData(modifiedNodes, currentlyViewedRootId, false);
            eventBus.emit('treeNodesModified', modifiedNodes);
            hasUpdates = true;
            hasTreeUpdates = true;
        }

        if (hasUpdates) {
            this.cache.lastGamesCheck = Date.now();
            if (hasTreeUpdates) {
                const cachedTree = this.cache.trees.get(currentlyViewedRootId);
                if (!cachedTree) {
                    this.cache.trees.set(currentlyViewedRootId, {
                        data: null,  // Will be populated later
                        timestamp: Date.now()
                    });
                } else {
                    cachedTree.timestamp = Date.now();
                }
            } 
            this.saveCache();
        }
        
        return hasUpdates;
    }


    updateTreeData(treeNodes, rootId, isFullUpdate = false) {
        if (!Array.isArray(treeNodes)) {
            console.error('Expected array of nodes, got:', treeNodes);
            return;
        }
        
        if (isFullUpdate) {
            // Handle full tree update
            this.setFullTree(rootId, treeNodes);
        } else {
            // Handle partial updates
            this.updateTreeNodes(treeNodes, rootId);
        }  
    
        this.saveCache();
    }

    updateGamesData(games, isFullUpdate = false) {
        if (!Array.isArray(games)) {
            console.error('Expected array of games, got:', games);
            return [];
        }
        
        if (isFullUpdate) {
            this.replaceAll(games);
        } else {
            this.updateGames(games);
        }  

        this.saveCache();
        return Array.from(this.cache.games.values())
            .map(game => game.data)
            .sort((a, b) => a.placement_index - b.placement_index);
    }


    updateTreeNodes(modifiedNodes, rootId) {
        if (!modifiedNodes?.length) return;
        
        const cachedTree = this.cache.trees.get(rootId);
        if (!cachedTree) return;

        let hasUpdates = false;
        
        modifiedNodes.forEach(updatedNode => {
            // Update flat map
            const existingNode = this.cache.nodesMap.get(updatedNode.id);
            
            if (existingNode) {
                // Preserve children if updating existing node
                const children = existingNode.children || [];
                this.cache.nodesMap.set(updatedNode.id, {
                    ...updatedNode,
                    children
                });
            } else {
                // New node
                this.cache.nodesMap.set(updatedNode.id, {
                    ...updatedNode,
                    children: []
                });
            }
            
            // Update hierarchical structure
            this.updateNodeInHierarchy(cachedTree.data, updatedNode);
            hasUpdates = true;
        });

        if (hasUpdates) {
            cachedTree.timestamp = Date.now();
            this.saveCache();
        }
    }

    updateNodeInHierarchy(treeNode, updatedNode) {
        if (treeNode.id === updatedNode.id) {
            // Preserve existing children when updating
            const children = treeNode.children || [];
            Object.assign(treeNode, updatedNode, { children });
            return true;
        }
        
        return treeNode.children?.some(child => 
            this.updateNodeInHierarchy(child, updatedNode)
        );
    }

    // Helper method to get a node quickly
    getNode(nodeId) {
        return this.cache.nodesMap.get(nodeId);
    }

    // Helper method to get parent of a node
    getParentNode(nodeId) {
        const node = this.getNode(nodeId);
        return node ? this.getNode(node.parent_id) : null;
    }

    clearTreeNodes(rootId) {
        // Ensure nodesMap exists
        if (!this.cache.nodesMap) {
            this.cache.nodesMap = new Map();
        }

        const removeNodes = (node) => {
            if (!node) return;
            this.cache.nodesMap.delete(node.id);
            node.children?.forEach(removeNodes);
        };
        
        const existingTree = this.cache.trees.get(rootId);
        if (existingTree?.data) {
            removeNodes(existingTree.data);
        }
    }

    // Load cache from localStorage
    loadCache() {
        try {
            const savedCache = localStorage.getItem('storyCache');
            if (savedCache) {
                const parsed = JSON.parse(savedCache);
                return {
                    games: new Map(parsed.games),
                    trees: new Map(parsed.trees),
                    nodesMap: new Map(parsed.nodesMap),
                    lastGamesCheck: parsed.lastGamesCheck || Date.now(),
                    lastUserId: parsed.lastUserId,
                    pagination: parsed.pagination,
                    filters: parsed.filters || {
                        hasContributed: null,
                        gameState: 'all'
                    }
                };
            }
        } catch (e) {
            console.error('Error loading cache:', e);
        }
        return null;
    }

    // Save cache to localStorage
    saveCache() {
        const cacheToSave = {
            games: Array.from(this.cache.games.entries()),
            trees: Array.from(this.cache.trees.entries()),
            nodesMap: Array.from(this.cache.nodesMap.entries()),
            lastGamesCheck: this.cache.lastGamesCheck,
            lastUserId: this.cache.lastUserId,
            pagination: this.cache.pagination,
            filters: this.cache.filters
        };
        
        try {
            localStorage.setItem('storyCache', JSON.stringify(cacheToSave));
        } catch (e) {
            console.error('Error saving cache:', e);
        }
    }

    setTree(rootId, treeData) {
        this.cache.trees.set(rootId, {
            data: treeData,
            timestamp: Date.now()
        });
        this.saveCache();
    }

    getTree(rootId) {
        console.log('getTree', rootId);
        return this.cache.trees.get(rootId);
    }

    getPaginatedData() {
        const start = (this.cache.pagination.currentPage - 1) * this.cache.pagination.itemsPerPage;
        const end = start + this.cache.pagination.itemsPerPage;
        
        const rootNodes = Array.from(this.cache.games.values())
            .map(item => item.data)
            .filter(data => !data.parent_id);
            
        // TODO: to test front end rendering
        return {
            items: rootNodes, // Return all items instead of slicing
            totalPages: 1,    // Temporarily set to 1
            currentPage: 1    // Temporarily set to 1
        };

/*         return {
            items: rootNodes.slice(start, end),
            totalPages: Math.ceil(rootNodes.length / this.cache.pagination.itemsPerPage),
            currentPage: this.cache.pagination.currentPage
        }; */
    }

    setPage(pageNumber) {
        this.cache.pagination.currentPage = pageNumber;
        this.saveCache();
    }

    // Add method to clear cache if needed
    clearCache() {
        this.cache = {
            games: new Map(),
            trees: new Map(),
            nodesMap: new Map(),
            lastGamesCheck: null,
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0
            }
        };
        this.saveCache();
    }

    // A meta has been added in the header to track user id and logged in status
    isUserLoggedIn() {
        return this.currentUserId !== 'null';
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    getRecentlyModifiedGames() {
        return Array.from(this.recentlyModifiedGames)
            .map(id => this.cache.games.get(id)?.data)
            .filter(game => game !== undefined);
    }

    // TODO: Delete this soon
/*     async shouldRefreshTree(rootId) {
        const lastCheck = this.treeChecks.get(rootId) || 0;
        const response = await fetch(`${this.path}text/checkTreeUpdates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rootId,
                lastCheck
            })
        });
        
        const result = await response.json();
        return result.needsUpdate;
    } */

    setTreeLastCheck(rootId) {
        this.treeChecks.set(rootId, Date.now());
        this.saveCache();
    }

    setFilters(filters) {
        console.log('setFilters', filters);
        this.cache.filters = {
            hasContributed: filters.hasContributed ?? null,
            gameState: filters.gameState ?? 'all'
        };
        this.saveCache();
    }

    getFilters() {
        return this.cache.filters;
    }

    /* // Add this method to the DataManager class called from storyManager.js prepareData() TODO: Delete this soon
    compareTreeData(oldTree, newTree) {
        console.log('compareTreeData', oldTree, newTree);
        const differences = [];
        
        // Helper function to compare nodes
        const compareNodes = (oldNode, newNode) => {
            if (!oldNode || !newNode) return null;
            
            const changes = {};
            let hasChanges = false;
            
            // Compare all properties except children
            Object.keys(newNode).forEach(key => {
                if (key !== 'children' && JSON.stringify(oldNode[key]) !== JSON.stringify(newNode[key])) {
                    changes[key] = {
                        old: oldNode[key],
                        new: newNode[key]
                    };
                    hasChanges = true;
                }
            });
            
            if (hasChanges) {
                differences.push({
                    id: newNode.id,
                    parent_id: newNode.parent_id,
                    changes
                });
            }
            
            // Recursively compare children
            if (newNode.children && oldNode.children) {
                newNode.children.forEach(newChild => {
                    const oldChild = oldNode.children.find(child => child.id === newChild.id);
                    compareNodes(oldChild, newChild);
                });
            }
        };
        
        compareNodes(oldTree, newTree);
        return differences;
    } */

     // For full list updates (filters, page refresh)
     replaceAll(games) {
        this.cache.games.clear();
        games.forEach(game => {
            this.cache.games.set(game.game_id, {
                data: this.normalizeGameData(game),
                timestamp: Date.now()
            });
        });
        this.cache.lastGamesCheck = Date.now();
    }

    // For poll updates
    updateGames(games) {
        games.forEach(game => {
            const normalized = this.normalizeGameData(game);
            const existing = this.cache.games.get(game.game_id);
            
            if (!existing || existing.timestamp < this.lastFullUpdate) {
                this.cache.games.set(game.game_id, {
                    data: normalized,
                    timestamp: Date.now()
                });
            }
        });
    }

    // Normalize game data to match the expected format
    normalizeGameData(game) {
        return {
            game_id: game.game_id,
            text_id: game.id,
            title: game.title,
            prompt: game.prompt,
            open_for_changes: game.openForChanges === '1' || 
                             game.openForChanges === true || 
                             game.openForChanges === 1,
            hasContributed: game.hasContributed === '1' || 
                           game.hasContributed === true || 
                           game.hasContributed === 1,
            text_count: parseInt(game.text_count) || 0,
            seen_count: parseInt(game.seen_count) || 0,
            unseen_count: parseInt(game.unseen_count) || 0,
            placement_index: parseInt(game.placement_index)
        };
    }

    setFullTree(rootId, treeData) {
        // Ensure nodesMap exists
        if (!this.cache.nodesMap) {
            this.cache.nodesMap = new Map();
        }

        // Clear existing nodes for this tree
        this.clearTreeNodes(rootId);
        
        // Flatten tree into nodesMap
        const flattenTree = (node, parentId = null) => {
            if (!node) return;
            
            const nodeData = { ...node, parent_id: parentId };
            this.cache.nodesMap.set(node.id, nodeData);
            
            node.children?.forEach(child => flattenTree(child, node.id));
        };
        
        flattenTree(treeData);
        
        // Store the hierarchical structure
        this.cache.trees.set(rootId, {
            data: treeData,
            timestamp: Date.now()
        });

        this.saveCache();
    }
}