export class DataManager {
    constructor(path) {
        this.path = path;
        this.cache = this.loadCache() || {
            games: new Map(),
            trees: new Map(),
            nodes: new Map(),
            lastGamesCheck: null,
            lastUserId: null,
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0
            }
        };
        this.currentUserId = null; // Track current user
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

    updateGamesData(games) {
        if (!Array.isArray(games)) {
            console.error('Expected array of games, got:', games);
            return;
        }

        // Update existing games
        games.forEach(game => {
            this.cache.games.set(game.game_id, {
                data: game,
                timestamp: Date.now()
            });
        });

        this.saveCache();
    }

    // Add method to check if games need refresh
    async checkForUpdates() {
        try {
            console.log('Sending request to:', `${this.path}game/modifiedSince`); // Debug URL
            console.log('With data:', { lastCheck: this.cache.lastGamesCheck }); // Debug payload

            const response = await fetch(`${this.path}game/modifiedSince`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lastCheck: this.cache.lastGamesCheck
                })
            });

            // Log the raw response first
            const rawText = await response.text();
            console.log('Raw server response:', rawText);

            let hasUpdates = false;

            // Try to parse as JSON only if it looks like JSON
            if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
                const modifiedGames = JSON.parse(rawText);
                if (modifiedGames.length > 0) {
                    await this.updateGamesData(modifiedGames);
                    hasUpdates = true;
                }
            } else {
                console.error('Received non-JSON response:', rawText);
            }
            
            // Always update the last check time
            console.log('Updating lastGamesCheck from:', this.cache.lastGamesCheck);
            this.cache.lastGamesCheck = Date.now();
            console.log('Updated lastGamesCheck to:', this.cache.lastGamesCheck);
            this.saveCache();
            
            return hasUpdates;
        } catch (error) {
            console.error('Error checking for updates:', error);
            return false;
        }
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
                pagination: parsed.pagination
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
            pagination: this.cache.pagination
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

        return {
            items: rootNodes.slice(start, end),
            totalPages: Math.ceil(rootNodes.length / this.cache.pagination.itemsPerPage),
            currentPage: this.cache.pagination.currentPage
        };
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

    updateGame(gameData) {
        const index = this.gamesData.findIndex(game => game.id === gameData.id);
        if (index !== -1) {
            this.gamesData[index] = gameData;
        } else {
            this.gamesData.push(gameData);
        }
    }
}