import { eventBus } from './eventBus.js';

export class DashboardManager {
    constructor() {
        this.container = document.querySelector('.dashboard');
        if (!this.container) {
            console.log('DashboardManager: No dashboard container found');
            return;
        }

        // Singleton pattern
        if (window.dashboardManagerInstance) {
            return window.dashboardManagerInstance;
        }

        this.dataManager = window.dataManager;
        this.flatGamesData = this.getFlatGamesData();
        
        // Initialize DataManager with flat games data
        this.initializeDataManager();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Set up collapsible functionality
        this.setupCollapsibleCategories();
        
        // Set up game navigation
        this.setupGameNavigation();
        
        
        window.dashboardManagerInstance = this;
        console.log('🎮🎮🎮 DashboardManager CONSTRUCTOR CALLED - Event listeners should be set up!');
    }


    /**
     * Categorize games and populate dashboard
     */
    categorizeAndPopulateDashboard() {
        if (!this.flatGamesData || this.flatGamesData.length === 0) {
            console.warn('DashboardManager: No games data available for categorization');
            return;
        }

        // Categorize games using the same logic as backend
        const categorizedData = this.categorizeGames(this.flatGamesData);
        
        // Populate dashboard with categorized data
        this.updateDashboardDisplay(categorizedData);
        
        console.log('DashboardManager: Categorized and populated dashboard with', this.flatGamesData.length, 'games');
    }

    /**
     * Get flat games data for DataManager compatibility
     */
    getFlatGamesData() {
        const scriptTag = document.getElementById('games-data');
        if (!scriptTag) {
            console.error('DashboardManager: No games-data script tag found');
            return [];
        }
        
        try {
            return JSON.parse(scriptTag.textContent);
        } catch (error) {
            console.error('DashboardManager: Error parsing games data:', error);
            return [];
        }
    }

    /**
     * Initialize DataManager with flat games data
     */
    initializeDataManager() {
        if (this.flatGamesData && this.flatGamesData.length > 0) {
            // Initialize DataManager cache with flat games data
            this.dataManager.updateGamesData(this.flatGamesData, true);
            console.log('DashboardManager: Initialized DataManager with', this.flatGamesData.length, 'games');
        }
    }

    /**
     * Categorize games using the same logic as backend
     */
    categorizeGames(games) {
        const isGuest = !this.dataManager.isUserLoggedIn();
        
        // Initialize dashboard data structure
        const dashboardData = {
            joinableGames: {
                invitations: { games: [], count: 0, hasUnreads: false },
                suggested: { games: [], count: 0, hasUnreads: false },
                other: { games: [], count: 0, hasUnreads: false }
            },
            inspiration: {
                weLiked: { games: [], count: 0, hasUnreads: false }
            }
        };
        
        // Only add user-specific sections if not a guest
        if (!isGuest) {
            dashboardData.myStories = {
                drafts: { games: [], count: 0, hasUnreads: false },
                active: { games: [], count: 0, hasUnreads: false },
                archives: { games: [], count: 0, hasUnreads: false }
            };
            
        }
        
        // Add closed subsection for all users (closed games for inspiration)
        dashboardData.inspiration.closed = { games: [], count: 0, hasUnreads: false };
        
        // Categorize each game
        games.forEach(game => {
            this.categorizeGame(game, dashboardData, isGuest);
        });
        
        return dashboardData;
    }

    /**
     * Categorize a single game into the appropriate dashboard sections
     */
    categorizeGame(game, dashboardData, isGuest) {
        // Use the SQL-provided category field directly - much simpler!
        const category = game.category;
        const hasUnreads = game.unseen_count > 0;
        
        // Map SQL categories to dashboard sections
        switch (category) {
            case 'myGames.drafts':
                if (!isGuest && dashboardData.myStories) {
                    dashboardData.myStories.drafts.games.push(game);
                    dashboardData.myStories.drafts.count++;
                    if (hasUnreads) dashboardData.myStories.drafts.hasUnreads = true;
                }
                break;
                
            case 'myGames.active':
                if (!isGuest && dashboardData.myStories) {
                    dashboardData.myStories.active.games.push(game);
                    dashboardData.myStories.active.count++;
                    if (hasUnreads) dashboardData.myStories.active.hasUnreads = true;
                }
                break;
                
            case 'myGames.archives':
                if (!isGuest && dashboardData.myStories) {
                    dashboardData.myStories.archives.games.push(game);
                    dashboardData.myStories.archives.count++;
                    if (hasUnreads) dashboardData.myStories.archives.hasUnreads = true;
                }
                break;
                
            case 'canJoin.invitations':
                dashboardData.joinableGames.invitations.games.push(game);
                dashboardData.joinableGames.invitations.count++;
                if (hasUnreads) dashboardData.joinableGames.invitations.hasUnreads = true;
                break;
                
            case 'canJoin.other':
                dashboardData.joinableGames.other.games.push(game);
                dashboardData.joinableGames.other.count++;
                if (hasUnreads) dashboardData.joinableGames.other.hasUnreads = true;
                break;
                
            case 'inspiration.closed':
                if (dashboardData.inspiration.closed) {
                    dashboardData.inspiration.closed.games.push(game);
                    dashboardData.inspiration.closed.count++;
                    if (hasUnreads) dashboardData.inspiration.closed.hasUnreads = true;
                }
                break;
                
            default:
                console.warn('Unknown category:', category, 'for game:', game.game_id);
                break;
        }
    }

    /**
     * Initialize event listeners for search/filter integration
     */
    initEventListeners() {
        // Listen for search and filter changes
        eventBus.on('searchApplied', (searchValue) => this.handleSearchApplied(searchValue));
        eventBus.on('filtersChanged', (filters) => this.handleFiltersChanged(filters));
        
        // Listen for game updates
        eventBus.on('gameModified', (data) => this.handleGameModified(data));
        eventBus.on('gameAdded', (game) => this.handleGameAdded(game));
        
        // Listen for game activity changes (same as game list)
        eventBus.on('gameActivityChanged', (data) => this.handleGameActivityUpdate(data));
        console.log('🎮🎮🎮 DashboardManager: gameActivityChanged event listener SET UP!');
        
        // Test event bus connectivity
        setTimeout(() => {
            console.log('🎮🎮🎮 DashboardManager: Testing event bus...');
            eventBus.emit('gameActivityChanged', { gameId: 'test', browsing: 1, writing: 1 });
        }, 1000);
        
        // NEW: Listen for category updates from DataManager
        eventBus.on('dashboardCategoriesUpdated', (categorizedData) => {
            this.updateDashboardDisplay(categorizedData);
        });
    }

    /**
     * Set up collapsible functionality for categories
     */
    setupCollapsibleCategories() {
        const categoryHeaders = this.container.querySelectorAll('.category-header');
        
        categoryHeaders.forEach(header => {
            header.addEventListener('click', () => {
                this.toggleCategory(header);
            });
        });
        
        // Set up browse button event handlers to prevent bubbling
        this.setupBrowseButtons();
    }

    /**
     * Toggle category collapse/expand
     */
    toggleCategory(header) {
        const categoryGames = header.nextElementSibling;
        const toggle = header.querySelector('.collapse-toggle');
        
        if (!categoryGames || !toggle) return;
        
        const isCollapsed = categoryGames.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            categoryGames.classList.remove('collapsed');
            toggle.classList.remove('collapsed');
        } else {
            // Collapse
            categoryGames.classList.add('collapsed');
            toggle.classList.add('collapsed');
        }
    }

    /**
     * Set up browse button event handlers to prevent event bubbling
     */
    setupBrowseButtons() {
        const browseButtons = this.container.querySelectorAll('.browse-button');
        
        browseButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                // Prevent the click from bubbling up to the category header
                event.stopPropagation();
                // The href will handle navigation naturally
            });
        });
    }

    /**
     * Set up game navigation
     */
    setupGameNavigation() {
        const gameItems = this.container.querySelectorAll('.dashboard-game-item');
        
        gameItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const gameId = item.dataset.gameId;
                const textId = item.dataset.textId;
                
                if (textId) {
                    this.navigateToGame(textId);
                } else {
                    console.warn('DashboardManager: No text ID found for game item');
                }
            });
        });
    }

    /**
     * Navigate to a specific game
     */
    navigateToGame(textId) {
        if (!textId) {
            console.error('DashboardManager: No text ID provided for navigation');
            return;
        }
        
        // Use the existing i18n system to create the URL
        const url = window.i18n.createUrl(`text/collab/${textId}`);
        console.log('DashboardManager: Navigating to game:', url);
        
        // Navigate to the game
        window.location.href = url;
    }

    /**
     * Handle search applied - update dashboard with filtered results
     */
    handleSearchApplied(searchValue) {
        console.log('DashboardManager: Search applied:', searchValue);
        
        if (!searchValue || searchValue.trim() === '') {
            // Clear search - restore original data
            this.restoreOriginalData();
        } else {
            // Apply search filter
            this.applySearchFilter(searchValue);
        }
    }

    /**
     * Handle filters changed - update dashboard with filtered results
     */
    handleFiltersChanged(filters) {
        console.log('DashboardManager: Filters changed:', filters);
        this.applyFilters(filters);
    }

    /**
     * Apply search filter to dashboard
     */
    applySearchFilter(searchValue) {
        if (!this.flatGamesData) return;
        
        // Get current games from DataManager
        const currentGames = this.getCurrentGamesFromDataManager();
        const filteredData = this.filterDashboardData(this.categorizeGames(currentGames), { search: searchValue });
        this.updateDashboardDisplay(filteredData);
    }

    /**
     * Apply filters to dashboard
     */
    applyFilters(filters) {
        if (!this.flatGamesData) return;
        
        // Get current games from DataManager
        const currentGames = this.getCurrentGamesFromDataManager();
        const filteredData = this.filterDashboardData(this.categorizeGames(currentGames), { filters });
        this.updateDashboardDisplay(filteredData);
    }

    /**
     * Filter dashboard data based on search and filters
     */
    filterDashboardData(data, options = {}) {
        const { search, filters } = options;
        const filteredData = JSON.parse(JSON.stringify(data)); // Deep clone
        
        // Apply search filter
        if (search) {
            this.applySearchToData(filteredData, search);
        }
        
        // Apply other filters
        if (filters) {
            this.applyFiltersToData(filteredData, filters);
        }
        
        return filteredData;
    }

    /**
     * Apply search to dashboard data
     */
    applySearchToData(data, searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        
        Object.keys(data).forEach(sectionKey => {
            const section = data[sectionKey];
            Object.keys(section).forEach(subcategoryKey => {
                const subcategory = section[subcategoryKey];
                if (subcategory.games) {
                    subcategory.games = subcategory.games.filter(game => {
                        const title = (game.title || '').toLowerCase();
                        return title.includes(searchLower);
                    });
                    subcategory.count = subcategory.games.length;
                    subcategory.hasUnreads = subcategory.games.some(game => game.unseen_count > 0);
                }
            });
        });
    }

    /**
     * Apply filters to dashboard data
     */
    applyFiltersToData(data, filters) {
        // This would implement the same filtering logic as the game list
        // For now, we'll implement basic filtering
        
        Object.keys(data).forEach(sectionKey => {
            const section = data[sectionKey];
            Object.keys(section).forEach(subcategoryKey => {
                const subcategory = section[subcategoryKey];
                if (subcategory.games) {
                    let filteredGames = subcategory.games;
                    
                    // Apply hasContributed filter
                    if (filters.hasContributed !== null && filters.hasContributed !== undefined) {
                        if (filters.hasContributed === true) {
                            filteredGames = filteredGames.filter(game => game.hasContributed);
                        } else if (filters.hasContributed === 'mine') {
                            filteredGames = filteredGames.filter(game => game.isMine);
                        }
                    }
                    
                    // Apply bookmarked filter
                    if (filters.bookmarked !== null && filters.bookmarked !== undefined) {
                        filteredGames = filteredGames.filter(game => 
                            filters.bookmarked ? game.isBookmarked : !game.isBookmarked
                        );
                    }
                    
                    // Apply game state filter
                    if (filters.gameState && filters.gameState !== 'all') {
                        filteredGames = filteredGames.filter(game => {
                            switch (filters.gameState) {
                                case 'open':
                                    return game.openForChanges;
                                case 'closed':
                                    return !game.openForChanges && !game.pending;
                                case 'pending':
                                    return game.pending;
                                default:
                                    return true;
                            }
                        });
                    }
                    
                    subcategory.games = filteredGames;
                    subcategory.count = filteredGames.length;
                    subcategory.hasUnreads = filteredGames.some(game => game.unseen_count > 0);
                }
            });
        });
    }

    /**
     * Update dashboard display with new data
     */
    updateDashboardDisplay(data) {
        console.log('🎮 DashboardManager: updateDashboardDisplay called - this will replace server-side HTML!');
        console.log('🎮 DashboardManager: Data sections:', Object.keys(data));
        
        // Check if server-side HTML already has games
        const existingGames = this.container.querySelectorAll('[data-game-id]');
        console.log('🎮 DashboardManager: Existing games in server-side HTML:', existingGames.length);
        
        if (existingGames.length > 0) {
            console.log('🎮 DashboardManager: Server-side HTML already has games, skipping replacement to preserve activity indicators');
            return;
        }
        
        // Update counts and unread indicators
        Object.keys(data).forEach(sectionKey => {
            const section = data[sectionKey];
            Object.keys(section).forEach(subcategoryKey => {
                const subcategory = section[subcategoryKey];
                const categoryElement = this.container.querySelector(`[data-category="${sectionKey}.${subcategoryKey}"]`);
                
                if (categoryElement) {
                    // Update count
                    const countElement = categoryElement.querySelector('.count');
                    if (countElement) {
                        countElement.textContent = `(${subcategory.count})`;
                    }
                    
                    // Update unread indicator
                    const titleElement = categoryElement.querySelector('.category-title');
                    if (titleElement) {
                        if (subcategory.hasUnreads) {
                            titleElement.classList.add('has-unreads');
                        } else {
                            titleElement.classList.remove('has-unreads');
                        }
                    }
                    
                    // Update game list
                    this.updateGameList(categoryElement, subcategory.games);
                }
            });
        });
    }

    /**
     * Update game list for a specific category
     */
    updateGameList(categoryElement, games) {
        const gamesContainer = categoryElement.nextElementSibling;
        if (!gamesContainer) return;
        
        console.log('🎮 DashboardManager: updateGameList called - REPLACING server-side HTML with JS-generated content');
        console.log('🎮 DashboardManager: Games to add:', games.length);
        console.log('🎮 DashboardManager: Game IDs:', games.map(g => g.game_id));
        
        // Clear existing games
        gamesContainer.innerHTML = '';
        
        // Add filtered games
        games.forEach(game => {
            const gameElement = this.createGameElement(game);
            gamesContainer.appendChild(gameElement);
        });
        
        // Re-setup navigation for new elements
        this.setupGameNavigation();
    }

    /**
     * Create a game element
     */
    createGameElement(game) {
        console.log('🎮 DashboardManager: createGameElement called with game data:', game);
        console.log('🎮 DashboardManager: game.game_id:', game.game_id);
        console.log('🎮 DashboardManager: game.text_id:', game.text_id);
        console.log('🎮 DashboardManager: game.id:', game.id);
        
        const gameElement = document.createElement('div');
        gameElement.className = 'dashboard-game-item';
        gameElement.setAttribute('data-game-id', game.game_id);
        gameElement.setAttribute('data-text-id', game.text_id || game.id);
        
        const title = game.title || window.i18n.translate('general.untitled');
        const activityTooltip = window.i18n.translate('activity.browsingVsEditing');
        
        gameElement.innerHTML = `
            <div class="game-title">
                <div class="unread-area">
                    ${game.unseen_count > 0 ? `<span class="unread-indicator" data-unread-count="${game.unseen_count}">${game.unseen_count}</span>` : ''}
                </div>
                <span class="title">${title}</span>
            </div>
            <div class="game-activity-indicator no-activity" data-i18n-title="activity.browsingVsEditing" title="${activityTooltip}" data-game-id="${game.game_id}">
                <span class="icon" data-svg="user"></span>
                <div class="activity-numbers">0:0</div>
            </div>
        `;
        
        // Populate SVG icons
        if (window.uiManager && window.uiManager.populateSvgs) {
            window.uiManager.populateSvgs([gameElement]);
        }
        
        return gameElement;
    }

    /**
     * Get current games from DataManager
     */
    getCurrentGamesFromDataManager() {
        // Get all games from DataManager cache
        const games = [];
        this.dataManager.cache.games.forEach((gameData, gameId) => {
            games.push(gameData.data);
        });
        return games;
    }

    /**
     * Restore original dashboard data
     */
    restoreOriginalData() {
        // For hybrid approach, we don't need to restore since server-side render is already there
        // This method is called when search is cleared, so we just re-categorize current data
        const currentGames = this.getCurrentGamesFromDataManager();
        const categorizedData = this.categorizeGames(currentGames);
        this.updateDashboardDisplay(categorizedData);
    }

    /**
     * Handle game modified event
     */
    handleGameModified(data) {
        const { newGame, oldGame } = data;
        
        // Check if the game's categorization might have changed
        const oldCategory = this.getGameCategory(oldGame);
        const newCategory = this.getGameCategory(newGame);
        
        if (oldCategory !== newCategory) {
            // Game moved between categories - use updated categories from DataManager
            console.log(`DashboardManager: Game ${newGame.game_id} moved from ${oldCategory} to ${newCategory}`);
            
            // Get updated categories (already rebuilt by DataManager)
            const updatedCategories = this.dataManager.getDashboardData();
            this.updateDashboardDisplay(updatedCategories);
        } else {
            // Same category - just update the game details
            this.updateGameInDashboard(newGame);
        }
    }

    /**
     * Handle game added event
     */
    handleGameAdded(game) {
        // Get updated categories (already rebuilt by DataManager)
        const updatedCategories = this.dataManager.getDashboardData();
        this.updateDashboardDisplay(updatedCategories);
    }

    /**
     * Update a specific game in the dashboard
     */
    updateGameInDashboard(game) {
        const gameElement = this.container.querySelector(`[data-game-id="${game.game_id}"]`);
        if (!gameElement) return;
        
        // Update title
        const titleElement = gameElement.querySelector('.title');
        if (titleElement) {
            titleElement.textContent = game.title || window.i18n.translate('general.untitled');
        }
        
        // Update unread count
        const unreadArea = gameElement.querySelector('.unread-area');
        const unreadElement = gameElement.querySelector('.unread-indicator');
        
        if (game.unseen_count > 0) {
            if (!unreadElement) {
                const unreadSpan = document.createElement('span');
                unreadSpan.className = 'unread-indicator';
                unreadSpan.dataset.unreadCount = game.unseen_count;
                unreadSpan.textContent = game.unseen_count;
                unreadArea.appendChild(unreadSpan);
            } else {
                unreadElement.textContent = game.unseen_count;
                unreadElement.dataset.unreadCount = game.unseen_count;
            }
        } else if (unreadElement) {
            unreadElement.remove();
        }
    }

    /**
     * Handle game activity updates (same logic as GameListUpdateManager)
     */
    handleGameActivityUpdate(activityData) {
        console.log('🎮 DashboardManager: handleGameActivityUpdate called with:', activityData);
        
        const { gameId, browsing, writing } = activityData;
        
        
        // Look for ALL game containers with this game ID (games can appear in multiple categories)
        const gameElements = this.container.querySelectorAll(`.dashboard-game-item[data-game-id="${gameId}"]`);
        
        if (gameElements.length === 0) {
            console.warn('🎮 DashboardManager: No game elements found for gameId:', gameId);
            return;
        }
        
        console.log('🎮 DashboardManager: Found', gameElements.length, 'game elements for gameId:', gameId);
        
        // Update ALL game elements with this game ID
        gameElements.forEach((gameElement, index) => {
            const activityIndicator = gameElement.querySelector('.game-activity-indicator');
            if (!activityIndicator) {
                console.warn('🎮 DashboardManager: No activity indicator found in game element', index);
                return;
            }
            
            // Update activity numbers
            const activityNumbers = activityIndicator.querySelector('.activity-numbers');
            if (activityNumbers) {
                const newText = `${browsing || 0}:${writing || 0}`;
                activityNumbers.textContent = newText;
            }
            
            // Update activity state classes
            const hasActivity = (browsing > 0 || writing > 0);
            activityIndicator.classList.toggle('has-activity', hasActivity);
            activityIndicator.classList.toggle('no-activity', !hasActivity);
        });
        
        console.log('🎮 DashboardManager: Updated', gameElements.length, 'activity indicators for game:', gameId);
    }

    /**
     * Get the category path for a game (e.g., "myStories.active" or "joinableGames.invitations")
     */
    getGameCategory(game) {
        const hasContributed = game.hasContributed;
        const hasJoined = game.hasJoined;
        const isInvited = game.invited;
        const hasTemporaryAccess = game.hasTemporaryAccess;
        const isBookmarked = game.isBookmarked;
        const isOpen = game.openForChanges;
        const isPending = game.pending;
        const isGuest = !this.dataManager.isUserLoggedIn();
        
        // Determine if this is an invitation (token-based or pending invitation)
        const isInvitation = hasTemporaryAccess || (isInvited && !hasJoined && !hasContributed);
        
        // My Stories (games I've contributed to) - only for logged-in users
        if (!isGuest && hasContributed) {
            if (isPending) {
                return 'myStories.drafts';
            } else if (isOpen) {
                return 'myStories.active';
            } else {
                return 'myStories.archives';
            }
        }
        // Games I can join (games I haven't contributed to, or all games for guests)
        else {
            if (isInvitation) {
                return 'joinableGames.invitations';
            } else {
                return 'joinableGames.other';
            }
        }
    }

    /**
     * Refresh the entire dashboard
     */
    async refreshDashboard() {
        try {
            // Fetch fresh games data from the server
            const endpoint = 'game/getGames';
            const url = window.i18n.createUrl(endpoint);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    filters: this.dataManager.getFilters(),
                    search: this.dataManager.getSearch()
                })
            });

            if (!response.ok) throw new Error('Failed to fetch games data');
            
            const games = await response.json();
            
            // Update DataManager with fresh data (this will automatically update categories)
            this.dataManager.updateGamesData(games, true);
            
            // Get updated categories from DataManager
            const categorizedData = this.dataManager.getDashboardData();
            this.updateDashboardDisplay(categorizedData);
            
        } catch (error) {
            console.error('DashboardManager: Error refreshing dashboard:', error);
        }
    }
}
