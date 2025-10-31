import { eventBus } from './eventBus.js';

export class DashboardManager {
    constructor() {
        this.container = document.querySelector('.dashboard');
        if (!this.container) {
            console.log('DashboardManager: No dashboard container found - exiting silently');
            return;
        }

        // Get DataManager from global scope (it's already initialized)
        this.dataManager = window.dataManager;
        if (!this.dataManager) {
            console.error('DashboardManager: DataManager not found on window object');
            return;
        }
        
        // Initialize event listeners for dashboard-specific functionality
        this.initEventListeners();
        
        // Set up UI interactions
        this.setupCollapsibleCategories();
        this.setupGameNavigation();
        
        console.log('🎮 DashboardManager: Initialized successfully');
    }

    /**
     * Initialize event listeners for search/filter integration
     */
    initEventListeners() {
        // DataManager handles filtersChanged/searchApplied/refreshGames automatically
        // We only listen to DataManager's rendering events
        
        // Listen for dashboard category updates from DataManager (main rendering event)
        eventBus.on('dashboardCategoriesUpdated', (categorizedData) => {
            this.redrawAllCategories(categorizedData);
        });
        
        // Listen for game updates
        eventBus.on('gameModified', (data) => this.handleGameModified(data));
        eventBus.on('gameAdded', (game) => this.handleGameAdded(game));
        // Pluralized removal events come from DataManager and other handlers
        eventBus.on('gamesRemoved', (gameIds) => {
            if (Array.isArray(gameIds)) {
                gameIds.forEach((id) => this.removeGameFromDashboard(String(id)));
            }
        });
        // Note: search/filter handling will decide view-removal events later
        
        // Listen for game activity changes (same as game list)
        eventBus.on('gameActivityChanged', (data) => this.handleGameActivityUpdate(data));
        console.log('🎮🎮🎮 DashboardManager: gameActivityChanged event listener SET UP!');
    }

    /**
     * Set up collapsible functionality for categories and browse buttons
     */
    setupCollapsibleCategories() {
        // Use event delegation for better performance and dynamic content support
        this.container.addEventListener('click', (e) => {
            const browseButton = e.target.closest('.browse-button');
            if (browseButton) {
                // Prevent click from bubbling to category header
                e.stopPropagation();
                // Let the <a> tag handle navigation naturally
                return;
            }
            
            const categoryHeader = e.target.closest('.category-header');
            if (categoryHeader) {
                this.toggleCategory(categoryHeader);
            }
        });
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
     * Set up game navigation using event delegation
     */
    setupGameNavigation() {
        // Use event delegation for better performance and dynamic content support
        this.container.addEventListener('click', (e) => {
            const gameItem = e.target.closest('.dashboard-game-item');
            if (gameItem) {
                e.preventDefault();
                const textId = gameItem.dataset.textId;
                
                if (textId) {
                    this.navigateToGame(textId);
                } else {
                    console.warn('DashboardManager: No text ID found for game item');
                }
            }
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
     * Remove a game from the dashboard and update count
     */
    removeGameFromDashboard(gameId) {
        const gameElements = this.container.querySelectorAll(`[data-game-id="${gameId}"]`);
        
        gameElements.forEach(gameElement => {
            // Find the category header via the games container's previous sibling
            const gamesContainer = gameElement.parentElement;
            const categoryElement = gamesContainer ? gamesContainer.previousElementSibling : null;
            const category = categoryElement ? categoryElement.dataset.category : null;
            
            gameElement.remove();
            if (category) {
                this.updateCategoryCountByCategory(category);
            }
        });
        
        console.log(`🎮 DashboardManager: Removed game ${gameId} from dashboard`);
    }

    /**
     * Add a game to the dashboard and update count
     */
    addGameToDashboard(game, category) {
        const categoryElement = this.container.querySelector(`[data-category="${category}"]`);
        if (!categoryElement) {
            console.warn('🎮 DashboardManager: Category element not found for:', category);
            return;
        }
        
        const gamesContainer = categoryElement.nextElementSibling;
        if (!gamesContainer) {
            console.warn('🎮 DashboardManager: Games container not found for category:', category);
            return;
        }
        
        // Check if game already exists
        const existingGame = gamesContainer.querySelector(`[data-game-id="${game.game_id}"]`);
        if (existingGame) {
            console.log('🎮 DashboardManager: Game already exists, skipping add');
            return;
        }
        
        // Create and add game element
        const gameElement = this.createGameElement(game);
        gamesContainer.appendChild(gameElement);
        
                    // Update count
        this.updateCategoryCountByCategory(category);
        
        console.log(`🎮 DashboardManager: Added game ${game.game_id} to category ${category}`);
    }

    /**
     * Update category count by delta (+1, -1, etc.)
     */
    updateCategoryCountByCategory(category) {
        const categoryElement = this.container.querySelector(`[data-category="${category}"]`);
        if (!categoryElement) return;
        
                    const countElement = categoryElement.querySelector('.count');
        if (!countElement) return;
        
        // Get current count from DOM
        const gamesContainer = categoryElement.nextElementSibling;
        const currentCount = gamesContainer ? gamesContainer.querySelectorAll('.dashboard-game-item').length : 0;
        
        // Update count
        countElement.textContent = `(${currentCount})`;
        
        console.log(`🎮 DashboardManager: Updated count for ${category}: ${currentCount}`);
    }

    /**
     * Update category unread indicator
     */
    updateCategoryUnread(category, hasUnreads) {
        const categoryElement = this.container.querySelector(`[data-category="${category}"]`);
        if (!categoryElement) return;
        
                    const titleElement = categoryElement.querySelector('.category-title');
        if (!titleElement) return;
        
        if (hasUnreads) {
                            titleElement.classList.add('has-unreads');
                        } else {
                            titleElement.classList.remove('has-unreads');
        }
        
        console.log(`🎮 DashboardManager: Updated unread for ${category}: ${hasUnreads}`);
    }

    /**
     * Redraw all games for a specific category (full replace)
     * Intended for filter/search results, not realtime updates
     */
    redrawGamesForCategory(categoryElement, games) {
        const gamesContainer = categoryElement.nextElementSibling;
        if (!gamesContainer) return;
        
        console.log('🎮 DashboardManager: redrawGamesForCategory called - REPLACING category contents');
        console.log('🎮 DashboardManager: Games to add:', games.length);
        console.log('🎮 DashboardManager: Game IDs:', games.map(g => g.game_id));
        
        // Clear existing games
        gamesContainer.innerHTML = '';
        
        // Add filtered games
        games.forEach(game => {
            const gameElement = this.createGameElement(game);
            gamesContainer.appendChild(gameElement);
        });
        
        // Navigation is handled by event delegation - no need to re-setup
    }

    /**
     * Redraw all categories from categorized data
     */
    redrawAllCategories(categorizedData) {
        if (!categorizedData) return;
        Object.keys(categorizedData).forEach(sectionKey => {
            const section = categorizedData[sectionKey];
            Object.keys(section).forEach(subKey => {
                const subcategory = section[subKey];
                const categoryPath = `${sectionKey}.${subKey}`;
                const headerEl = this.container.querySelector(`[data-category="${categoryPath}"]`);
                if (!headerEl) return;
                this.redrawGamesForCategory(headerEl, subcategory.games || []);
                this.updateCategoryCountByCategory(categoryPath);
                this.updateCategoryUnread(categoryPath, !!subcategory.hasUnreads);
            });
        });
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
     * Handle game modified event
     */
    handleGameModified(data) {
        const { newGame, oldGame } = data;
        
        // Check if the game's categorization might have changed
        // Use backend-provided category field (single source of truth)
        const oldCategory = oldGame.category;
        const newCategory = newGame.category;
        
        if (oldCategory !== newCategory) {
            // Game moved between categories - need to move the DOM element
            console.log(`DashboardManager: Game ${newGame.game_id} moved from ${oldCategory} to ${newCategory}`);
            
            // Get updated categories (already rebuilt by DataManager)
            const updatedCategories = this.dataManager.getDashboardData();
            
            // Move the game element to the new category
            this.moveGameBetweenCategories(newGame, oldCategory, newCategory, updatedCategories);

            // Update unread flags for both old and new categories based on current categorized data
            const [oldSection, oldSub] = (oldCategory || '').split('.');
            const [newSection, newSub] = (newCategory || '').split('.');
            try {
                if (oldSection && oldSub && updatedCategories[oldSection] && updatedCategories[oldSection][oldSub]) {
                    this.updateCategoryUnread(oldCategory, !!updatedCategories[oldSection][oldSub].hasUnreads);
                }
                if (newSection && newSub && updatedCategories[newSection] && updatedCategories[newSection][newSub]) {
                    this.updateCategoryUnread(newCategory, !!updatedCategories[newSection][newSub].hasUnreads);
                }
            } catch (e) {
                console.warn('🎮 DashboardManager: Unable to update unread flags after move', e);
            }
        } else {
            // Same category - just update the game details
            this.updateGameInDashboard(newGame);
        }
    }

    /**
     * Move a game element between categories
     */
    moveGameBetweenCategories(game, oldCategory, newCategory, categorizedData) {
        console.log('🎮 DashboardManager: moveGameBetweenCategories called');
        
        // Find the existing game element
        const gameElement = this.container.querySelector(`[data-game-id="${game.game_id}"]`);
        if (!gameElement) {
            console.warn('🎮 DashboardManager: Game element not found for moving:', game.game_id);
            return;
        }
        
        // Find the new category container
        const newCategoryElement = this.container.querySelector(`[data-category="${newCategory}"]`);
        if (!newCategoryElement) {
            console.warn('🎮 DashboardManager: New category element not found:', newCategory);
            return;
        }
        
        const newGamesContainer = newCategoryElement.nextElementSibling;
        if (!newGamesContainer) {
            console.warn('🎮 DashboardManager: New games container not found for category:', newCategory);
            return;
        }
        
        // Move the game element to the new container
        newGamesContainer.appendChild(gameElement);
        
        // Update counts for both old and new categories using surgical approach
        this.updateCategoryCountByCategory(oldCategory);
        this.updateCategoryCountByCategory(newCategory);
        
        console.log('🎮 DashboardManager: Successfully moved game between categories');
    }

    /**
     * Handle game added event
     */
    handleGameAdded(game) {
        console.log('🎮 DashboardManager: handleGameAdded called with game:', game);
        console.log('🎮 DashboardManager: Game category:', game.category);
        console.log('🎮 DashboardManager: Game data:', {
            game_id: game.game_id,
            text_id: game.text_id,
            title: game.title,
            category: game.category // Use backend-provided category
        });
        
        // Get updated categories (already rebuilt by DataManager)
        const updatedCategories = this.dataManager.getDashboardData();
        
        // Instead of replacing all content, add the new game to the appropriate category
        this.addNewGameToDashboard(game, updatedCategories);
    }

    /**
     * Add a new game to the dashboard without replacing existing content
     */
    addNewGameToDashboard(game, categorizedData) {
        console.log('🎮 DashboardManager: addNewGameToDashboard called with game:', game);
        
        // Use backend-provided category field (single source of truth)
        const gameCategory = game.category;
        if (!gameCategory) {
            console.warn('🎮 DashboardManager: Game missing category field:', game);
            return;
        }
        
        console.log('🎮 DashboardManager: Game category:', gameCategory);
        
        // Use surgical add method
        this.addGameToDashboard(game, gameCategory);
        
        console.log('🎮 DashboardManager: Successfully added new game to dashboard');
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

        // Also refresh category-level unread flag based on DataManager's categorized data
        try {
            const category = game.category;
            if (category) {
                const [sectionKey, subKey] = category.split('.');
                const categorized = this.dataManager.getDashboardData();
                const hasUnreads = !!(categorized[sectionKey] && categorized[sectionKey][subKey] && categorized[sectionKey][subKey].hasUnreads);
                this.updateCategoryUnread(category, hasUnreads);
            }
        } catch (e) {
            console.warn('🎮 DashboardManager: Unable to update category unread flag after game update', e);
        }
    }

    /**
     * Handle game activity updates (same logic as GameListUpdateManager)
     */
    handleGameActivityUpdate(activityData) {
        console.log('🎮 DashboardManager: handleGameActivityUpdate called with:', activityData);
        
        const { gameId, browsing, writing } = activityData;
        
        // Debug: Check if game exists in DataManager cache
        const gameInCache = this.dataManager.cache.games.get(String(gameId));
        console.log('🎮 DashboardManager: Game in cache:', !!gameInCache, gameInCache?.data);
        
        // Debug: List all visible games on dashboard
        const allGameElements = this.container.querySelectorAll('.dashboard-game-item[data-game-id]');
        const visibleGameIds = Array.from(allGameElements).map(el => el.dataset.gameId);
        console.log('🎮 DashboardManager: Visible game IDs on dashboard:', visibleGameIds);
        
        // Look for ALL game containers with this game ID (games can appear in multiple categories)
        const gameElements = this.container.querySelectorAll(`.dashboard-game-item[data-game-id="${gameId}"]`);
        
        if (gameElements.length === 0) {
            console.warn('🎮 DashboardManager: No game elements found for gameId:', gameId);
            console.warn('🎮 DashboardManager: This could mean:');
            console.warn('  - Game was published but not yet added to dashboard');
            console.warn('  - Game exists but is in a collapsed category');
            console.warn('  - Game doesn\'t match current user\'s categories/permissions');
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

}
