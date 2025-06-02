export class DataManager {
    static instance = null;
    
    static getInstance() {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager();
            window.dataManager = DataManager.instance;
        }
        return DataManager.instance;
    }

    constructor() {
        if (DataManager.instance) {
            return DataManager.instance;
        }
        
        /* this.currentViewedRootStoryId = null; */
        const userIdMeta = document.querySelector('meta[name="user"]');
        this.currentUserId = userIdMeta.getAttribute('data-user-id') !== 'null' ? userIdMeta.getAttribute('data-user-id') : null;
        this.cache = this.loadCache() || {
            games: new Map(),
            trees: new Map(),
            nodesMap: new Map(), // A flat structure to make updates easier
            lastGamesCheck: null,
            currentViewedRootId: null,
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0
            },
            search: '',
            searchResults: {
                rootId: null,
                nodes: {}
            },
            filters: {
                hasContributed: null,
                gameState: 'all'
            }
        };

        // Move this after cache initialization and add explicit check for empty string
        if (!this.cache.search || this.cache.search.trim() === '') {
            console.log('No search term found, clearing search results');
            this.emptySearchResults();
            this.saveCache(); // Ensure the cleared state is saved
        }

        // Ensure nodesMap exists even if loaded from cache
        if (!this.cache.nodesMap) {
            this.cache.nodesMap = new Map();
        }

        // Subscribe to relevant events
        eventBus.on('requestGameData', (gameId) => {
            const gameData = this.cache.games.get(gameId)?.data;
            console.log('GAME DATA in requestGameData', gameData);
            eventBus.emit('gameDataResponse', { gameId, data: gameData });
        });

        // Update the data cache with passed parameter
        eventBus.on('updateGame', (gameData) => {
            this.updateGamesData([gameData]);
        });

        // Update the data cache for a node
        eventBus.on('updateNode', (nodeData) => {
            this.updateNode(nodeData.id, nodeData);
        });

        // Delete a node, and maybe the whole tree/game if its the root
        eventBus.on('deleteNode', (nodeId) => {
            this.deleteNode(nodeId);
        });
        
        this.saveCache();
        this.initAuthState();
        DataManager.instance = this;

        // TODO: help with testing
        //this.clearCache();
    }

    initAuthState() {
        const storedUserId = localStorage.getItem('currentUserId');
        const currentUserId = document.querySelector('meta[name="user"]').dataset.userId;

        // Always set the initial state
        this.currentUserId = currentUserId;
        
        // If they're different, emit the auth change event
        if (storedUserId !== currentUserId) {
            // Update localStorage
            localStorage.setItem('currentUserId', currentUserId);
            // Emit the change event
            this.handleAuthStateChange(currentUserId);
        }
    }

    // To keep track of the currently viewed root story id
    setCurrentViewedRootStoryId(rootStoryId) {
        // Only proceed if the value has actually changed
        if (this.cache.currentViewedRootId === rootStoryId) {
            return;
        }
        
        // Ensure tree exists in cache
        if (!this.cache.trees.has(rootStoryId)) {
            this.cache.trees.set(rootStoryId, {
                data: null,  // Will be populated by setFullTree later
                timestamp: Date.now()
            });
        }
        
        // Update the value
        this.cache.currentViewedRootId = rootStoryId;
        this.saveCache();
        
        // Emit event with the new value
        eventBus.emit('sseParametersChanged', { 
            type: 'rootStoryId',
            value: rootStoryId 
        });
    }

    getCurrentViewedRootStoryId() {
        return this.cache.currentViewedRootId;
    }

    getInitialCache() {
        return {
            games: new Map(),
            trees: new Map(),
            nodesMap: new Map(),
            lastGamesCheck: Date.now(),
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0
            },
            search: '',
            searchResults: new Map(),
            filters: {
                hasContributed: null,
                gameState: 'all'
            },
        };
    }

    // TODO: there may be some issues when you are logged out by being away for a while... and still have current User set? What checks the current user? 
    setCurrentUser(userId) {
        const previousUserId = this.currentUserId;
        this.currentUserId = userId;

        if (previousUserId !== userId) {
            // Clear cache if user changed
            this.clearCache();
            this.saveCache();
        }
    }

    // Add method to check if games need refresh
    async checkForUpdates() {
        if (!navigator.onLine) {
            console.log('Browser is offline, skipping update check');
            return false;
        }

        const rootId = this.getCurrentViewedRootStoryId();
        console.log('Root ID:', rootId);
        const lastGamesCheck = this.cache.lastGamesCheck || 0;

        try {
            const endpoint = 'game/modifiedSince';
            const url = window.i18n.createUrl(endpoint);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lastGamesCheck: lastGamesCheck,
                    filters: this.cache.filters || {},
                    search: this.cache.search || '',
                    rootStoryId: rootId,
                    lastTreeCheck: this.cache.trees.get(rootId)?.timestamp || 0,
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

    // This creates the recently modified games list
    handleUpdateResponse(response, currentlyViewedRootId) {
        console.log('handleUpdateResponse called with:', response);
        
        const { modifiedGames, modifiedNodes, searchResults } = response;
        let hasUpdates = false;
        let hasTreeUpdates = false;

        // search results first so that they are ready for other updates to consult
        if (searchResults && searchResults.length > 0) {
            console.log('Processing search results first:', searchResults.length, 'results');
            this.updateSearchResults(searchResults, currentlyViewedRootId, false);
        } else {
            console.log('No search results to process');
        }

        if (modifiedGames?.length > 0) {
            this.updateGamesData(modifiedGames, false);
            // this event refreshes the view in gameListRenderer.js
            // LETS TRY TO BE MORE GRANULAR
            // eventBus.emit('gamesModified', modifiedGames);
            hasUpdates = true;
        }

        if (modifiedNodes?.length > 0) {
            console.log('Processing modifiedNodes with search context:', {
                nodesCount: modifiedNodes.length,
                hasSearchResults: !!this.cache.searchResults.nodes,
                searchResultsCount: Object.keys(this.cache.searchResults.nodes || {}).length
            });
            
            this.updateTreeData(modifiedNodes, currentlyViewedRootId, false);
            // NOTHING SEEMS TO BE LISTENING FOR THIS EVENT
            //eventBus.emit('treeNodesModified', modifiedNodes);
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
/*         console.log('Starting updateTreeData:', {
            modifiedNodesLength: treeNodes?.length,
            rootId,
            cacheState: {
                hasRoot: this.cache.nodesMap.has(String(rootId)),
                rootData: this.cache.nodesMap.get(String(rootId))
            }
        }); */

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
        // Try both string and number versions of the key
        let rootNode = this.cache.nodesMap.get(String(rootId)) || 
                      this.cache.nodesMap.get(Number(rootId));

        console.log('Root node lookup:', {
            searchId: rootId,
            foundWithString: this.cache.nodesMap.get(String(rootId)),
            foundWithNumber: this.cache.nodesMap.get(Number(rootId)),
            finalRootNode: rootNode
        });

        if (!rootNode) {
            console.error('Root node not found for ID:', rootId);
            return;
        }

        if (!modifiedNodes?.length) return;
        let newNodesAdded = false;
        const originalPlayerCount = rootNode.playerCount;
        let playerCountUpdated = rootNode.playerCount;

        // Sort nodes to ensure parents are processed before children
        const sortedNodes = this.sortNodesByHierarchy(modifiedNodes);
        const nodesToUpdate = [];
        const nodesAdded = [];

        // Add new nodes
        sortedNodes.forEach(node => {
            if (!this.cache.nodesMap.has(String(node.id))) {
                /* console.log('Adding new node:', node); */
                this.addNewNode(node.id, node);
                newNodesAdded = true;
                playerCountUpdated = Math.max(playerCountUpdated, node.playerCount);
                nodesAdded.push(node);
            }else{
                /* console.log('Updating node:', node); */
                // Only update nodes that haven't been added
                nodesToUpdate.push(node);
            }
        });

        // Emit an event for an update of the ui
        if (nodesAdded.length > 0) {
            eventBus.emit('nodesAdded', nodesAdded);
        }

        // Update all the nodes in the tree with the new player count
        if (playerCountUpdated > originalPlayerCount) {
            this.updatePlayerCountForTree(playerCountUpdated, rootId);
            eventBus.emit('gamePlayerCountUpdate', { newPlayerCount: playerCountUpdated, gameId: rootNode.gameId });
        }

        if (nodesToUpdate.length > 0) {
            console.log('Updating nodes:', nodesToUpdate);
            nodesToUpdate.forEach(node => {
                if (this.cache.nodesMap.has(String(node.id))) {
                    this.updateNode(node.id, node);
                }
            });
        }

        const cachedTree = this.cache.trees.get(rootId);
        if (cachedTree) {
            cachedTree.timestamp = Date.now();
            this.saveCache();
        }
    }

    sortNodesByHierarchy(nodes) {
        const nodeMap = new Map();
        nodes.forEach(node => nodeMap.set(node.id, node));

        const sortedNodes = [];
        const visited = new Set();

        const visit = (node) => {
            if (visited.has(node.id)) return;
            visited.add(node.id);

            const parent = nodeMap.get(node.parent_id);
            if (parent && !visited.has(parent.id)) {
                visit(parent);
            }

            sortedNodes.push(node);
        };

        nodes.forEach(node => visit(node));
        return sortedNodes;
    }

    updateNode(nodeId, updateData) {        
        // Always convert nodeId to string for consistency
        const stringId = String(nodeId);

        // Look up only using string ID
        const existingNode = this.cache.nodesMap.get(stringId);

        if (!existingNode) {
            // Log each cache entry separately (keep your existing debug code)
            this.cache.nodesMap.forEach((value, key) => {
                console.log(`Key: "${key}" (${typeof key})`, {
                    value,
                    hasPlayerCount: value?.hasOwnProperty('playerCount'),
                    playerCount: value?.playerCount
                });
            });

            this.addNewNode(stringId, updateData);
            eventBus.emit('nodeUpdated', { oldNode: null, newNode: updateData });
            return;
        }
    
        // Preserve all existing properties, including children
        const updatedNode = {
            ...existingNode,
            ...updateData,
            children: existingNode.children || [],
        };
        
        // Update permissions if they are included in the update data
        if (updateData.permissions) {
            updatedNode.permissions = updateData.permissions;
        } else {
            // Keep existing permissions if not provided in update data
            updatedNode.permissions = existingNode.permissions;
        }

        // Emit an event with both the old node and the new node
        eventBus.emit('nodeUpdated', { oldNode: existingNode, newNode: updatedNode });

        // Update the flat map
        this.cache.nodesMap.set(stringId, updatedNode);

        // Update the hierarchical tree structure
        const rootId = this.getCurrentViewedRootStoryId();
        const cachedTree = this.cache.trees.get(rootId);

        if (cachedTree?.data) {
            this.updateNodeInHierarchy(cachedTree.data, updatedNode);
        }

        // Save changes to the cache
        this.saveCache();
    }
    
    updateNodeInHierarchy(treeNode, updatedNode) {
        // Convert both IDs to strings for comparison
        const treeNodeId = String(treeNode.id);
        const updatedNodeId = String(updatedNode.id);

        /* console.log("Checking node:", treeNodeId, "against updated node:", updatedNodeId); */
        
        if (treeNodeId === updatedNodeId) {
            /* console.log(`Updating node in hierarchy: ${treeNodeId}`); */
            const children = treeNode.children || [];
            Object.assign(treeNode, updatedNode, { children });
            return true;
        }
        
        if (treeNode.children) {
            for (const child of treeNode.children) {
                if (this.updateNodeInHierarchy(child, updatedNode)) {
                    return true;
                }
            }
        }
        
        /* console.log(`Node with ID ${updatedNodeId} not found in current branch.`); */
        return false;
    }

    addNewNode(nodeId, nodeData) {
        // Convert ID to string
        const stringId = String(nodeId);

        // Normalize the data
        const normalizedData = {
            ...nodeData,
            id: stringId,
            parent_id: nodeData.parent_id ? String(nodeData.parent_id) : null,
            game_id: String(nodeData.game_id),
            children: nodeData.children || [],
            permissions: nodeData.permissions || {}
        };

        this.cache.nodesMap.set(stringId, normalizedData);

        // Log the node addition
        console.log(`[DEBUG] Added new node data:`, {
            id: normalizedData.id,
            idType: typeof normalizedData.id,
            status: normalizedData.text_status
        });

        // Update the hierarchical structure
        const rootId = this.getCurrentViewedRootStoryId();
        const cachedTree = this.cache.trees.get(String(rootId));

        if (cachedTree?.data) {
            const inserted = this.insertNodeInHierarchy(cachedTree.data, normalizedData);
            console.log('Inserted node:', inserted);
        }

        this.saveCache();
        return normalizedData;
    }

    insertNodeInHierarchy(treeNode, newNode) {
/*         console.log('insertNodeInHierarchy called with:', {
            treeNode,
            newNode,
            parentId: newNode.parent_id
        }); */

        // Ensure the node is in the flat map
        this.cache.nodesMap.set(String(newNode.id), {
            ...newNode,
            children: newNode.children || []
        });
        
        const parentNode = this.findNodeInTree(treeNode, String(newNode.parent_id));
        /* console.log('Found parent node:', parentNode); */

        if (parentNode) {
            // Ensure the parent node has a children array
            parentNode.children = parentNode.children || [];
            
            // Add the new node to the parent's children array
            parentNode.children.push({
                ...newNode,
                children: newNode.children || []
            });
            
            /* console.log(`Inserted node ${newNode.id} under parent ${newNode.parent_id}`); */
            return true;
        } else {
            console.warn('Parent node search details:', {
                searchedId: String(newNode.parent_id),
                treeNodeId: treeNode.id,
                treeStructure: JSON.stringify(treeNode, null, 2)
            });
            return false;
        }
    }

    findNodeInTree(treeNode, nodeId) {
        if (treeNode.id === nodeId) {
            return treeNode;
        }
        if (treeNode.children) {
            for (let child of treeNode.children) {
                const found = this.findNodeInTree(child, nodeId);
                if (found) return found;
            }
        }
        return null;
    }

    // Update the player count if a new node increases the player count
    updatePlayerCountForTree(rootId, playerCount) {
        this.cache.nodesMap.forEach(node => {
            if (node.rootId === rootId) {
                node.playerCount = playerCount;
            }
        });

        const cachedTree = this.cache.trees.get(rootId);
        if (cachedTree?.data) {
            this.updatePlayerCountInHierarchy(cachedTree.data, playerCount);
        }
    }

    updatePlayerCountInHierarchy(treeNode, playerCount) {
        treeNode.playerCount = playerCount;
        treeNode.children?.forEach(child => this.updatePlayerCountInHierarchy(child, playerCount));
    }

    // Helper method to get a node quickly
    getNode(nodeId) {
        return this.cache.nodesMap.get(String(nodeId));
    }

    // Helper method to get parent of a node
    getParentNode(nodeId) {
        const node = this.getNode(nodeId);
        return node ? this.getNode(node.parent_id) : null;
    }

    // Load cache from localStorage
    loadCache() {
        try {
            const savedCache = localStorage.getItem('storyCache');
            if (savedCache) {
                const parsed = JSON.parse(savedCache);
                const cache = {
                    games: new Map(parsed.games || []),
                    trees: new Map(parsed.trees || []),
                    nodesMap: new Map(parsed.nodesMap || []),
                    lastGamesCheck: parsed.lastGamesCheck || Date.now(),
                    currentViewedRootId: parsed.currentViewedRootId,
                    pagination: parsed.pagination,
                    search: parsed.search || '',
                    searchResults: {
                        rootId: parsed.searchResults?.rootId || null,
                        nodes: parsed.searchResults?.nodes || {}
                    },
                    filters: parsed.filters || {
                        hasContributed: null,
                        gameState: 'all'
                    },
                };
                return cache;
            }
        } catch (e) {
            console.error('Error loading cache:', e);
        }
        return null;
    }

    // Save cache to localStorage
    saveCache() {
        // Filter out null keys from trees before saving
        const cleanTrees = new Map(
            Array.from(this.cache.trees.entries())
                .filter(([key]) => key !== null)
        );
        
        const cacheData = {
            games: Array.from(this.cache.games.entries()),
            trees: Array.from(cleanTrees.entries()),
            nodesMap: Array.from(this.cache.nodesMap.entries()),
            lastGamesCheck: this.cache.lastGamesCheck,
            currentViewedRootId: this.cache.currentViewedRootId,
            pagination: this.cache.pagination,
            search: this.cache.search,
            searchResults: {
                rootId: this.cache.searchResults.rootId,
                nodes: this.cache.searchResults.nodes
            },
            filters: this.cache.filters,
        };
        
        try {
            localStorage.setItem('storyCache', JSON.stringify(cacheData));
/*             console.log('Cache saved successfully. Sample of saved data:', {
                gamesCount: cacheToSave.games.length,
                treesCount: cacheToSave.trees.length,
                nodesCount: cacheToSave.nodesMap.length,
                firstNode: cacheToSave.nodesMap[0]
            }); */
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
        return this.cache.trees.get(rootId);
    }

    getTreeByGameId(gameId) {
        const game = this.getGame(String(gameId));
        if (!game) return null;
        return this.getTree(game.data.text_id);
    }

    getGame(gameId) {
        return this.cache.games.get(String(gameId));
    }

    getGameRootId(gameId) {
        const game = this.getGame(gameId);
        if (!game) return null;
        return game.data.text_id;
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
            },
            search: '',
            searchResults: new Map(),
            filters: {
                hasContributed: null,
                gameState: 'all'
            }
        };
        localStorage.removeItem('storyCache');  // Completely remove from localStorage
    }

    // A meta has been added in the header to track user id and logged in status
    isUserLoggedIn() {
        return this.currentUserId !== 'null';
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    // Add getter for SSE parameters
    getSSEParameters() {
        const rootId = this.getCurrentViewedRootStoryId();
        return {
            lastGamesCheck: this.cache.lastGamesCheck || 0,
            filters: this.cache.filters || {},
            search: this.cache.search || '',
            rootStoryId: rootId,
            lastTreeCheck: this.cache.trees.get(rootId)?.timestamp || 0,
        };
    }

    setTreeLastCheck(rootId) {
        this.treeChecks.set(rootId, Date.now());
        this.saveCache();
    }

    setFilters(filters) {

        this.cache.filters = {
            hasContributed: filters.hasContributed ?? null,
            gameState: filters.gameState ?? 'all'
        };
        this.saveCache();

        // Only proceed if the value has actually changed
        if (JSON.stringify(this.cache.filters) === JSON.stringify(filters)) {
            return;
        }

        // Emit event with the new value
        eventBus.emit('sseParametersChanged', { 
            type: 'filters',
            value: filters 
        });
    }

    getFilters() {
        return this.cache.filters;
    }

    getSearch() {
        return this.cache.search;
    }

    setSearch(search) {
        // Only proceed if the value has actually changed
        if (this.cache.search === search) {
            return;
        }
        
        // Update the value
        this.cache.search = search;
        this.saveCache();
        
        // Emit event with the new value
        eventBus.emit('sseParametersChanged', { 
            type: 'search',
            value: search 
        });
    }

     // For full list updates (filters, page refresh)
     replaceAll(games) {
        // Check for any games that were open and are now closed
        // Also check for games where hasJoined was false and is now true
        games.forEach(game => {
            const gameId = String(game.game_id);
            const normalized = this.normalizeGameData(game);
            const existingGame = this.cache.games.get(gameId);
            
            const updateReason = this.checkForPermissionUpdates(existingGame, normalized);
            if (updateReason) {
                console.log(`Game ${normalized.text_id} ${updateReason}, requesting permission update`);
                this.handleEntireTreeUpdate(gameId, normalized.text_id);
            }
        });

        // Now clear and update the cache
        this.cache.games.clear();
        games.forEach(game => {
            // Always use string ID for the key
            const gameId = String(game.game_id);
            this.cache.games.set(gameId, {
                data: this.normalizeGameData(game),
                timestamp: Date.now()
            });
        });
        this.cache.lastGamesCheck = Date.now();
    }


    // For poll updates
    updateGames(games) {
        if (!Array.isArray(games)) {
            games = [games]; // Convert single game object to array
        }
        
        games.forEach(game => {
            const normalized = this.normalizeGameData(game);
            // Always use string ID for the key
            const gameId = String(game.game_id);
            
            // Check if the game already exists in the cache
            const existingGame = this.cache.games.get(gameId);
            
            console.log(`Processing game ${gameId}:`, {
                exists: !!existingGame,
                existingData: existingGame?.data,
                newData: normalized
            });
            
            if (existingGame) {
                const updateReason = this.checkForPermissionUpdates(existingGame, normalized);
                if (updateReason) {
                    console.log(`Game ${normalized.text_id} ${updateReason}, requesting permission update`);
                    this.handleEntireTreeUpdate(gameId, normalized.text_id);
                }
                
                // Game exists - emit gameModified event with old and new game data
                console.log(`Emitting gameModified for ${gameId}`);
                eventBus.emit('gameModified', { newGame: normalized, oldGame: existingGame.data });
            } else {
                // New game - emit gameAdded event
                console.log(`Emitting gameAdded for ${gameId}`);
                eventBus.emit('gameAdded', normalized);
            }
            
            // Update the cache
            this.cache.games.set(gameId, {
                data: normalized,
                timestamp: Date.now()
            });
        });
    }

    // Handle game closure by requesting full tree update
    async handleEntireTreeUpdate(gameId, rootId) {
        console.log(`handleEntireTreeUpdate called for game ${gameId}, root ${rootId}`);
        
        // Check if this tree is currently being viewed
        const isCurrentlyViewed = this.cache.currentViewedRootId === rootId;
        
        // Check if we have this tree in cache
        const hasTreeInCache = this.cache.trees.has(rootId);
        
        if (!isCurrentlyViewed) {
            console.log(`Tree ${rootId} is not currently viewed, removing from cache`);
            // If not being viewed, just remove from cache
            this.cache.trees.delete(rootId);
            this.clearTreeNodes(rootId);
            this.saveCache();
            return;
        }
        
        if (!hasTreeInCache) {
            console.log(`Tree ${rootId} not found in cache, no update needed`);
            return;
        }

        // Get the old tree from cache
        const oldTree = this.cache.trees.get(rootId);

        try {
            // Request full tree update
            const response = await fetch(`text/getTree/${rootId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error('Failed to fetch full tree:', response.status, response.statusText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const treeData = await response.json();
            console.log("Full update for tree:", treeData);
            
            if (!treeData || !treeData[0]) {
                console.error('No tree data received from server');
                return;
            }
            
            // Update the tree with new permissions
            this.setFullTree(rootId, treeData[0]);
            
            // Emit event to notify UI
            console.log('oldTree', oldTree.data);
            console.log('newTree', treeData[0]);
            eventBus.emit('treeFullyUpdated', { oldTree: oldTree.data, newTree: treeData[0] });
            
            console.log('Full tree update completed');
        } catch (error) {
            console.error('Error in handleEntireTreeUpdate:', error);
        }
    }

/*     //update one game with incomplete data
    updateGame(gameData) {
        const game = this.cache.games.get(gameData.game_id);

        const updatedGame = {
            ...game,
            ...gameData
        };
        
        this.cache.games.set(game.game_id, {
            data: updatedGame,
            timestamp: Date.now()
        });
    } */

    // Normalize game data to match the expected format
    normalizeGameData(game) {
        return {
            game_id: String(game.game_id),  // Convert to string
            text_id: String(game.id),       // Convert to string
            title: game.title,
            prompt: game.prompt,
            openForChanges: game.openForChanges,  // Preserve original value type
            open_for_changes: game.openForChanges === '1' || 
                             game.openForChanges === true || 
                             game.openForChanges === 1,
            hasContributed: game.hasContributed === '1' || 
                           game.hasContributed === true || 
                           game.hasContributed === 1,
            hasJoined: game.hasJoined === '1' || 
                      game.hasJoined === true || 
                      game.hasJoined === 1,
            text_count: parseInt(game.text_count) || 0,
            seen_count: parseInt(game.seen_count) || 0,
            unseen_count: parseInt(game.unseen_count) || 0,
            placement_index: parseInt(game.placement_index)
        };
    }

    // This the main logic handling the flat map / tree structure, when a full tree is received. 
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
            
            const stringId = String(node.id);
            const nodeData = { 
                ...node,
                id: stringId,
                parent_id: parentId ? String(parentId) : null
            };
            this.cache.nodesMap.set(stringId, nodeData);
            
            node.children?.forEach(child => flattenTree(child, stringId));
        };
        
        flattenTree(treeData);
        
        // Store the hierarchical structure
        this.cache.trees.set(rootId, {
            data: treeData,
            timestamp: Date.now()
        });

        this.saveCache();
    }

    // When setting a 
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

    handleAuthStateChange(newUserId) {
        // Clear cache and set current user 
        this.clearCache();
        this.setCurrentUser(newUserId);
        
        // If logging in, fetch fresh server data (not when logging out)
        if (newUserId !== null && newUserId !== 'null') {
            eventBus.emit('refreshGameList');
        }
    }

    deleteNode(nodeId) {
        /* console.log('DELETE NODEID?', nodeId); */
        nodeId = String(nodeId);
        const nodeToDelete = this.cache.nodesMap.get(nodeId);
        
        if (!nodeToDelete) {
            console.warn(`Node ${nodeId} not found in cache`);
            return false;
        }

        const nodeIsRoot = nodeToDelete.parent_id === null;
        const gameId = nodeToDelete.game_id;
        const game = this.getGame(gameId);
        const rootId = game.data.text_id;

        if (nodeIsRoot) {
            // Root node deletion - clean up entire tree and game
            this.cache.trees.delete(rootId);
            this.clearTreeNodes(rootId);
            if (gameId) {
                this.cache.games.delete(String(gameId));
            }
        } else {
            // Non-root node deletion
            // Use flat map to get parent directly
            const parentNode = this.cache.nodesMap.get(String(nodeToDelete.parent_id));
            if (parentNode) {
                // Update parent's children in flat map
                parentNode.children = parentNode.children.filter(
                    child => String(child.id) !== nodeId
                );

                // Update the hierarchy
                const cachedTree = this.cache.trees.get(rootId);
                if (cachedTree?.data) {
                    const hierarchyParent = this.findNodeInTree(cachedTree.data, String(nodeToDelete.parent_id));
                    if (hierarchyParent) {
                        hierarchyParent.children = hierarchyParent.children.filter(
                            child => String(child.id) !== nodeId
                        );
                    }
                }
            }

            // Remove from flat map
            this.cache.nodesMap.delete(nodeId);

            // Check if user still has contributions and update game accordingly
            if (game) {
                const hasRemainingContributions = this.checkUserContributions(gameId);
                if (!hasRemainingContributions) {
                    game.data.hasContributed = false;
                    this.cache.games.set(String(gameId), {
                        data: game.data,
                        timestamp: Date.now()
                    });
                    // Emit event to update UI if needed
                    eventBus.emit('gameContributionStatusChanged', {
                        gameId: gameId,
                        hasContributed: false
                    });
                }
            }
        }

        this.saveCache();
        return true;
    }

    // Add this new method
    checkUserContributions(gameId) {
        const currentUserId = this.getCurrentUserId();
        if (!currentUserId || currentUserId === 'null') return false;

        // Use the flat map to efficiently check all nodes in the tree
        return Array.from(this.cache.nodesMap.values()).some(node => 
            node.game_id === gameId && 
            node.writer_id === currentUserId
        );
    }

    getSearchResults() {
        return this.cache.searchResults;
    }

    updateSearchResults(searchResults, rootStoryId, isFullUpdate = false) {
        console.log('Updating search results:', {
            "rootStoryId": rootStoryId,
            "isFullUpdate": isFullUpdate,
            "resultsCount": searchResults?.length
        });

        if (!rootStoryId) {
            console.log('No root story ID provided, clearing search results');
            this.cache.searchResults = {
                rootId: null,
                nodes: {}
            };
            this.saveCache();
            return;
        }

        if (isFullUpdate || this.cache.searchResults.rootId !== rootStoryId) {
            // Clear previous search results for full updates or different trees
            this.cache.searchResults = {
                rootId: rootStoryId,
                nodes: {}
            };
        }

        // Update the search results cache
        searchResults.forEach(node => {
            // Add numeric 1 to the comparison
            const writingMatches = node.writingMatches === '1' || node.writingMatches === 1 || node.writingMatches === true;
            const noteMatches = node.noteMatches === '1' || node.noteMatches === 1 || node.noteMatches === true;
            const titleMatches = node.titleMatches === '1' || node.titleMatches === 1 || node.titleMatches === true;
            const writerMatches = node.writerMatches === '1' || node.writerMatches === 1 || node.writerMatches === true;
            const keywordMatches = node.keywordMatches === '1' || node.keywordMatches === 1 || node.keywordMatches === true;

            this.cache.searchResults.nodes[String(node.id)] = {
                id: node.id,
                // Only true if any of the specific match types are true
                matches: writingMatches || noteMatches || titleMatches || writerMatches || keywordMatches,
                writingMatches,
                noteMatches,
                titleMatches,
                writerMatches,
                keywordMatches
            };
        });

        this.saveCache();
    }

    emptySearchResults() {
        this.cache.search = '';
        this.cache.searchResults = {
            rootId: null,
            nodes: {}
        };
    }

    normalizeSearchResults(searchResults, rootStoryId, lastUpdate) {
        // Transform the search results into the desired structure
        return {
            rootStoryId: rootStoryId,
            results: Array.isArray(searchResults) ? searchResults.map(item => ({
                id: item.id,
                matches: Boolean(
                    item.writingMatches === '1' || item.writingMatches === true ||
                    item.noteMatches === '1' || item.noteMatches === true ||
                    item.titleMatches === '1' || item.titleMatches === true ||
                    item.writerMatches === '1' || item.writerMatches === true ||
                    item.keywordMatches === '1' || item.keywordMatches === true
                ),
                writingMatches: item.writingMatches === '1' || item.writingMatches === true,
                noteMatches: item.noteMatches === '1' || item.noteMatches === true,
                titleMatches: item.titleMatches === '1' || item.titleMatches === true,
                writerMatches: item.writerMatches === '1' || item.writerMatches === true,
                keywordMatches: item.keywordMatches === '1' || item.keywordMatches === true
            })) : [],
            lastUpdate: lastUpdate
        };
    }

    // Add method to get current locale from URL
    getCurrentLocale() {
        // Extract locale from URL path (e.g., /en/page)
        const pathMatch = window.location.pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?)\//)
        if (pathMatch) return pathMatch[1];
        
        // Or from query parameter (e.g., ?lang=en)
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        if (langParam) return langParam;
        
        // Fallback to default
        return 'en';
    }

    /**
     * Check if game state changes require permission updates
     * Returns the reason for update if needed, null otherwise
     */
    checkForPermissionUpdates(existingGame, newGameData) {
        if (!existingGame) return null;
        
        const wasJoined = existingGame.data.hasJoined;
        const isNowJoined = newGameData.hasJoined;
        const wasOpen = String(existingGame.data.openForChanges) === '1';
        const isNowClosed = String(newGameData.openForChanges) === '0';
        
        if (wasOpen && isNowClosed) {
            return 'game closed';
        } else if (!wasJoined && isNowJoined) {
            return 'user joined game';
        }
        
        return null;
    }
}