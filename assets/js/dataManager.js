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

        this.currentViewedGameId = null;
        const userIdMeta = document.querySelector('meta[name="user"]');
        this.path = path;
        this.cache = this.loadCache() || {
            games: new Map(),
            trees: new Map(),
            nodes: new Map(),
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
            lastCheck: null
        };
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
        eventBus.on('showcaseChanged', (rootStoryId) => this.setCurrentViewedRootStoryId(rootStoryId));
        
        this.saveCache();
        DataManager.instance = this;
        //this.clearCache();
    }

    setCurrentViewedRootStoryId(rootStoryId) {
        this.currentViewedRootStoryId = rootStoryId;
    }

    getCurrentViewedRootStoryId() {
        return this.currentViewedRootStoryId;
    }

    getInitialCache() {
        return {
            games: new Map(),
            trees: new Map(),
            nodes: new Map(),
            lastGamesCheck: null,
            lastUserId: null,
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0
            },
            filters: {
                hasContributed: null,  // null = all, 'contributor', 'mine'
                gameState: 'all',  // 'all', 'open', 'closed', 'pending'
                // Future filters:
                // sort: 'newest',   // 'newest', 'oldest', etc.
                // search: ''        // search term
            },
            lastCheck: null
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

    updateGamesData(games) {
        if (!Array.isArray(games)) {
            console.error('Expected array of games, got:', games);
            return [];
        }
        console.log('updateGamesData', games);
        const updatedGameIds = [];
        games.forEach(game => {
            const existingGame = this.cache.games.get(game.id);
            const gameChanged = !existingGame || 
                existingGame.data.open_for_changes !== game.open_for_changes ||
                existingGame.data.text_count !== game.text_count ||
                existingGame.data.seen_count !== game.seen_count ||
                existingGame.data.unseen_count !== game.unseen_count ||
                existingGame.data.title !== game.title ||
                existingGame.data.voteCount !== game.voteCount ||
                existingGame.data.hasVoted !== game.hasVoted;
                
            if (gameChanged) {
                this.cache.games.set(game.id, {
                    data: {
                        ...game,
                        text_id: game.id || null,
                        open_for_changes: game.openForChanges === '1' || game.open_for_changes === true,
                        hasContributed: game.hasContributed === '1' || game.has_contributed === true,
                        text_count: parseInt(game.text_count) || 0,
                        seen_count: parseInt(game.seen_count) || 0,
                        unseen_count: parseInt(game.unseen_count) || 0
                    },
                    timestamp: Date.now()
                });
                updatedGameIds.push(game.id);
            }
        });

        if (updatedGameIds.length > 0) {
            this.saveCache();
            console.log('Emitting gamesUpdated for:', updatedGameIds);
            eventBus.emit('gamesUpdated', updatedGameIds);
        }

        return updatedGameIds;
    }

    // Add method to check if games need refresh
    async checkForUpdates() {
        if (!navigator.onLine) {
            console.log('Browser is offline, skipping update check');
            return false;
        }

        try {
            //console.log('Sending update check request...');
            const response = await fetch(`${this.path}game/modifiedSince`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lastCheck: this.cache.lastGamesCheck || 0,
                    filters: this.cache.filters || {},
                    rootStoryId: this.currentViewedRootStoryId || null
                })
            });

            //console.log('Update check response:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            //console.log('Update check data:', data);
            return this.handleUpdateResponse(data);
        } catch (error) {
            if (error.name === 'AbortError' || error.name === 'TypeError') {
                console.log('Update check error:', error.message);
                return false;
            }
            console.error('Update check failed:', error);
            return false;
        }
    }

    handleUpdateResponse(modifiedGames) {
        if (modifiedGames.length > 0) {
            // Clear previous modifications
            this.recentlyModifiedGames = new Set();
            
            // Update cache and track modified games
            modifiedGames.forEach(game => {
                this.cache.games.set(game.id, {
                    data: game,
                    timestamp: Date.now()
                });
                this.recentlyModifiedGames.add(game.id);
            });

            this.cache.lastGamesCheck = Date.now();
            this.saveCache();
            
            // Emit event only once
            eventBus.emit('gamesModified', modifiedGames);
            return true;
        }
        
        this.cache.lastGamesCheck = Date.now();
        return false;
    }

    // Load cache from localStorage
    loadCache() {
        const savedCache = localStorage.getItem('storyCache');
        if (savedCache) {
            const parsed = JSON.parse(savedCache);
            return {
                games: new Map(parsed.games),
                trees: new Map(parsed.trees),
                nodes: new Map(parsed.nodes),
                lastGamesCheck: parsed.lastGamesCheck,
                lastUserId: parsed.lastUserId,
                pagination: parsed.pagination,
                filters: parsed.filters || {  // Add filters to cache loading
                    hasContributed: null,
                    gameState: 'all'
                }
            };
        }
        return null;
    }

    // Save cache to localStorage
    saveCache() {
        const cacheToSave = {
            games: Array.from(this.cache.games.entries()),
            trees: Array.from(this.cache.trees.entries()),
            nodes: Array.from(this.cache.nodes.entries()),
            lastGamesCheck: this.cache.lastGamesCheck,
            lastUserId: this.cache.lastUserId,
            pagination: this.cache.pagination,
            filters: this.cache.filters  // Add filters to cache saving
        };
        localStorage.setItem('storyCache', JSON.stringify(cacheToSave));
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

    setNode(nodeId, nodeData) {
        this.cache.nodes.set(nodeId, {
            data: nodeData,
            timestamp: Date.now()
        });
        this.saveCache();
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
        localStorage.removeItem('storyCache');
        this.cache = {
            games: new Map(),
            trees: new Map(),
            nodes: new Map(),
            lastGamesCheck: null,
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0
            }
        };
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

    // New method for initial data load
    initializeGamesData(games) {
        if (!Array.isArray(games)) {
            console.error('Expected array of games, got:', games);
            return;
        }

        games.forEach(game => {
            this.cache.games.set(game.id, {
                data: {
                    ...game,
                    text_id: game.id || null,
                    open_for_changes: game.openForChanges === '1' || game.open_for_changes === true,
                    hasContributed: game.hasContributed === '1' || game.has_contributed === true,
                    text_count: parseInt(game.text_count) || 0,
                    seen_count: parseInt(game.seen_count) || 0,
                    unseen_count: parseInt(game.unseen_count) || 0
                },
                timestamp: Date.now()
            });
        });

        this.saveCache();
    }

    async shouldRefreshTree(rootId) {
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
    }

    getFilters() {
        return this.cache.filters;
    }

    // Add this method to the DataManager class
    compareTreeData(oldTree, newTree) {
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
    }
}