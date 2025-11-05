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
        
        // Animation timing constants (in milliseconds)
        this.ANIMATION_DURATION = 500; // Duration for game element animations (entering/updating/removing)
        this.FLASH_TO_ANIMATION_DELAY = 200; // Delay between flash start and animation start (warning time)
        // Flash duration = delay + animation duration (so flash covers warning + animation)
        this.FLASH_DURATION = this.FLASH_TO_ANIMATION_DELAY + this.ANIMATION_DURATION; // 700ms total
        this.UNREAD_REMOVAL_DELAY = 300; // Delay before removing unread indicator element
        this.REMOVAL_MESSAGE_DURATION = 3000; // How long to show removal message (3 seconds)
        
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
        const category = header.dataset.category;
        
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
     * Flash the category to warn user before a change
     * Flashes the entire dashboard-category element (always visible)
     */
    flashCategory(category) {
        const categoryElement = this.container.querySelector(`[data-category="${category}"]`);
        if (!categoryElement) return;
        
        // Find the parent dashboard-category element
        const dashboardCategory = categoryElement.closest('.dashboard-category');
        if (!dashboardCategory) return;
        
        // Add flash class, remove after animation
        dashboardCategory.classList.add('flash-warning');
        setTimeout(() => {
            dashboardCategory.classList.remove('flash-warning');
        }, this.FLASH_DURATION);
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
     * Shows a message explaining why the game was removed
     */
    removeGameFromDashboard(gameId, reason = 'filterMismatch') {
        const gameElements = this.container.querySelectorAll(`[data-game-id="${gameId}"]`);
        
        gameElements.forEach(gameElement => {
            // Find the category header via the games container's previous sibling
            const gamesContainer = gameElement.parentElement;
            const categoryElement = gamesContainer ? gamesContainer.previousElementSibling : null;
            const category = categoryElement ? categoryElement.dataset.category : null;
            
            if (category) {
                // Flash category to warn user, then animate out
                this.flashCategory(category);
                setTimeout(() => {
                    // Show removal message before animating out
                    this.showRemovalMessage(gameElement, reason, null);
                    
                    gameElement.classList.add('removing');
                    
                    // Update count when animation starts (count will decrement)
                    this.updateCategoryCountByCategory(category);
                    
                    // After animation completes, keep message visible for readable duration
                    setTimeout(() => {
                        // Transform game element to message-only state
                        this.transformToMessageOnly(gameElement);
                        
                        // Remove message after readable duration
                        setTimeout(() => {
                            gameElement.remove();
                        }, this.REMOVAL_MESSAGE_DURATION);
                    }, this.ANIMATION_DURATION);
                }, this.FLASH_TO_ANIMATION_DELAY);
            } else {
                // No category found - remove directly
                gameElement.remove();
            }
        });
        
        console.log(`🎮 DashboardManager: Removed game ${gameId} from dashboard`);
    }
    
    /**
     * Show a removal message in the game element
     */
    showRemovalMessage(gameElement, reason, newCategory = null) {
        let messageKey;
        let messageText;
        let params = null;
        
        if (reason === 'categoryMoved' && newCategory) {
            // Format category name for display
            const [section, sub] = newCategory.split('.');
            const categoryPath = section && sub ? `dashboard.${sub}` : 'dashboard.my_stories';
            const categoryName = window.i18n.translate(categoryPath);
            messageKey = 'general.gameMovedToCategory';
            params = { category: categoryName };
            messageText = window.i18n.translate(messageKey, params);
        } else {
            // Filter mismatch
            messageKey = 'general.gameRemovedFilterMismatch';
            messageText = window.i18n.translate(messageKey);
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'removal-message';
        messageElement.setAttribute('data-i18n', messageKey);
        if (params) {
            messageElement.setAttribute('data-i18n-params', JSON.stringify(params));
        }
        messageElement.textContent = messageText;
        
        // Add to game element (will be visible during animation)
        gameElement.appendChild(messageElement);
    }
    
    /**
     * Transform game element to message-only state after animation
     */
    transformToMessageOnly(gameElement) {
        // Hide all content except the message
        const allChildren = Array.from(gameElement.children);
        allChildren.forEach(child => {
            if (!child.classList.contains('removal-message')) {
                child.style.display = 'none';
            }
        });
        
        // Make the message element prominent
        gameElement.classList.add('removal-message-only');
        
        // Adjust styling to make message visible
        gameElement.style.minHeight = 'auto';
        gameElement.style.padding = 'var(--spacing-small) var(--spacing-medium)';
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
        
        // Create element but don't add to DOM yet - add it after flash delay starts
        const gameElement = this.createGameElement(game);
        
        // Flash category to warn user first
        this.flashCategory(category);
        
        // After flash delay, add element and animate
        setTimeout(() => {
            // Add element to DOM (starts invisible, will animate in)
            gamesContainer.appendChild(gameElement);
            
            // Start game animation and count update together
            gameElement.classList.add('entering');
            this.updateCategoryCountByCategory(category);
            
            setTimeout(() => {
                gameElement.classList.remove('entering');
            }, this.ANIMATION_DURATION);
        }, this.FLASH_TO_ANIMATION_DELAY);
        
        console.log(`🎮 DashboardManager: Added game ${game.game_id} to category ${category}`);
    }

    /**
     * Update category count by delta (+1, -1, etc.)
     * Category headers are always visible, so always animate count changes
     */
    updateCategoryCountByCategory(category) {
        const categoryElement = this.container.querySelector(`[data-category="${category}"]`);
        if (!categoryElement) return;
        
        const countElement = categoryElement.querySelector('.count');
        if (!countElement) return;
        
        // Get current count from DOM
        const gamesContainer = categoryElement.nextElementSibling;
        const currentCount = gamesContainer ? gamesContainer.querySelectorAll('.dashboard-game-item:not(.removing)').length : 0;
        
        // Category headers are always visible, so always animate count updates
        countElement.classList.add('animating');
        setTimeout(() => {
            countElement.classList.remove('animating');
        }, this.ANIMATION_DURATION);
        
        // Update count
        countElement.textContent = `(${currentCount})`;
        
        console.log(`🎮 DashboardManager: Updated count for ${category}: ${currentCount}`);
    }

    /**
     * Update category unread indicator
     * Category headers are always visible, so always animate unread changes
     */
    updateCategoryUnread(category, hasUnreads) {
        const categoryElement = this.container.querySelector(`[data-category="${category}"]`);
        if (!categoryElement) return;
        
        const titleElement = categoryElement.querySelector('.category-title');
        if (!titleElement) return;
        
        const hadUnreads = titleElement.classList.contains('has-unreads');
        
        if (hasUnreads) {
            titleElement.classList.add('has-unreads');
        } else {
            titleElement.classList.remove('has-unreads');
        }
        
        // Category headers are always visible, so always animate if state changed
        if (hasUnreads !== hadUnreads) {
            titleElement.classList.add('animating');
            setTimeout(() => {
                titleElement.classList.remove('animating');
            }, this.ANIMATION_DURATION);
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
     * This is called on filter/search changes - full redraw, no animations
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
        
        // Create activity indicator placeholder (always present, transparent when no activity)
        const activityIndicator = this.createActivityIndicator(game.game_id, 0, 0);
        
        gameElement.innerHTML = `
            <div class="game-title">
                <div class="unread-area">
                    ${game.unseen_count > 0 ? `<span class="unread-indicator" data-unread-count="${game.unseen_count}">${game.unseen_count}</span>` : ''}
                </div>
                <span class="title">${title}</span>
            </div>
        `;
        
        // Append activity indicator (always present, will be updated when activity changes)
        gameElement.appendChild(activityIndicator);
        
        // Populate SVG icons via eventBus (includes activity indicator SVG)
        const svgElements = gameElement.querySelectorAll('[data-svg]');
        if (svgElements.length > 0) {
            eventBus.emit('populateSvgs', { elements: Array.from(svgElements) });
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
        
        // Handle old category removal animation
        if (oldCategory) {
            // Flash old category to warn user, then animate out
            this.flashCategory(oldCategory);
            setTimeout(() => {
                // Show removal message about category move
                this.showRemovalMessage(gameElement, 'categoryMoved', newCategory);
                
                gameElement.classList.add('removing');
                
                // Update old category count when animation starts
                this.updateCategoryCountByCategory(oldCategory);
                
                // Wait for animation, then move
                setTimeout(() => {
                    // Remove message element before moving (we'll show it in new location if needed)
                    const messageElement = gameElement.querySelector('.removal-message');
                    if (messageElement) {
                        messageElement.remove();
                    }
                    
                    gameElement.classList.remove('removing');
                    newGamesContainer.appendChild(gameElement);
                    
                    // Flash new category, wait, then animate in
                    this.flashCategory(newCategory);
                    setTimeout(() => {
                        gameElement.classList.add('entering');
                        // Update new category count when animation starts
                        this.updateCategoryCountByCategory(newCategory);
                        
                        setTimeout(() => {
                            gameElement.classList.remove('entering');
                        }, this.ANIMATION_DURATION);
                    }, this.FLASH_TO_ANIMATION_DELAY);
                }, this.ANIMATION_DURATION);
            }, this.FLASH_TO_ANIMATION_DELAY);
        } else {
            // No old category - just add to new category
            newGamesContainer.appendChild(gameElement);
            
            // Flash new category, wait, then animate in
            this.flashCategory(newCategory);
            setTimeout(() => {
                gameElement.classList.add('entering');
                // Update count when animation starts
                this.updateCategoryCountByCategory(newCategory);
                
                setTimeout(() => {
                    gameElement.classList.remove('entering');
                }, this.ANIMATION_DURATION);
            }, this.FLASH_TO_ANIMATION_DELAY);
        }
        
        console.log('🎮 DashboardManager: Successfully moved game between categories');
    }

    /**
     * Handle game added event
     */
    handleGameAdded(game) {
        console.log('🎮 DashboardManager: handleGameAdded called with game:', game);
        
        // Use backend-provided category field (single source of truth)
        const gameCategory = game.category;
        if (!gameCategory) {
            console.warn('🎮 DashboardManager: Game missing category field:', game);
            return;
        }
        
        // Add the game to the appropriate category
        this.addGameToDashboard(game, gameCategory);
    }

    /**
     * Update a specific game in the dashboard
     */
    updateGameInDashboard(game) {
        const gameElement = this.container.querySelector(`[data-game-id="${game.game_id}"]`);
        if (!gameElement) return;
        
        // Get category for animation logic
        const gamesContainer = gameElement.parentElement;
        const categoryElement = gamesContainer ? gamesContainer.previousElementSibling : null;
        const category = categoryElement ? categoryElement.dataset.category : null;
        
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
                const oldCount = parseInt(unreadElement.dataset.unreadCount || '0');
                unreadElement.textContent = game.unseen_count;
                unreadElement.dataset.unreadCount = game.unseen_count;
                // Already has animation from CSS
            }
        } else if (unreadElement) {
            // Animate out before removing
            unreadElement.classList.add('removing');
            setTimeout(() => {
                unreadElement.remove();
            }, this.UNREAD_REMOVAL_DELAY);
        }
        
        // Handle animations - always flash and animate (even if container is hidden)
        if (category) {
            // Flash category, wait, then animate update
            this.flashCategory(category);
            setTimeout(() => {
                gameElement.classList.add('updating');
                setTimeout(() => {
                    gameElement.classList.remove('updating');
                }, this.ANIMATION_DURATION);
            }, this.FLASH_TO_ANIMATION_DELAY);
        }

        // Also refresh category-level unread flag based on DataManager's categorized data
        if (category) {
            try {
                const [sectionKey, subKey] = category.split('.');
                const categorized = this.dataManager.getDashboardData();
                const hasUnreads = !!(categorized[sectionKey] && categorized[sectionKey][subKey] && categorized[sectionKey][subKey].hasUnreads);
                this.updateCategoryUnread(category, hasUnreads);
            } catch (e) {
                console.warn('🎮 DashboardManager: Unable to update category unread flag after game update', e);
            }
        }
    }

    /**
     * Create an activity indicator element
     */
    createActivityIndicator(gameId, browsing, writing) {
        const activityTooltip = window.i18n.translate('activity.browsingVsEditing');
        const hasActivity = (browsing > 0 || writing > 0);
        
        const indicator = document.createElement('div');
        indicator.className = `game-activity-indicator ${hasActivity ? 'has-activity' : 'no-activity'}`;
        indicator.setAttribute('data-i18n-title', 'activity.browsingVsEditing');
        indicator.setAttribute('title', activityTooltip);
        indicator.setAttribute('data-game-id', gameId);
        
        indicator.innerHTML = `
            <span class="icon" data-svg="user"></span>
            <div class="activity-numbers">${browsing || 0}:${writing || 0}</div>
        `;
        
        // Note: SVG population happens after indicator is added to DOM (in handleGameActivityUpdate)
        // This ensures the element is in the DOM before we try to populate it
        
        return indicator;
    }

    /**
     * Handle game activity updates - dynamically add/remove activity indicators
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
        
        const hasActivity = (browsing > 0 || writing > 0);
        
        // Update ALL game elements with this game ID
        gameElements.forEach((gameElement, index) => {
            let existingIndicator = gameElement.querySelector('.game-activity-indicator');
            
            // If indicator doesn't exist, create it (shouldn't happen, but just in case)
            if (!existingIndicator) {
                existingIndicator = this.createActivityIndicator(gameId, browsing, writing);
                gameElement.appendChild(existingIndicator);
                
                // Populate SVG for new indicator
                const iconElement = existingIndicator.querySelector('.icon[data-svg]');
                if (iconElement) {
                    eventBus.emit('populateSvgs', { elements: [iconElement] });
                }
            } else {
                // Update existing indicator
                const activityNumbers = existingIndicator.querySelector('.activity-numbers');
                if (activityNumbers) {
                    activityNumbers.textContent = `${browsing || 0}:${writing || 0}`;
                }
                
                // Update activity state classes
                existingIndicator.classList.toggle('has-activity', hasActivity);
                existingIndicator.classList.toggle('no-activity', !hasActivity);
            }
            
            console.log(`🎮 DashboardManager: Updated activity indicator for game element ${index} (activity: ${hasActivity})`);
        });
        
        console.log('🎮 DashboardManager: Updated', gameElements.length, 'activity indicators for game:', gameId);
    }

}
