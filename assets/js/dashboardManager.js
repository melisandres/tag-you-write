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
        
        // Track activity per category: Map<category, { browsing: number, writing: number }>
        this.categoryActivity = new Map();
        
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
        
        // Initialize activity indicators for games already in DOM (from template)
        this.initializeGameActivityIndicators();
        
        // Initialize category activity indicators (populate SVGs)
        this.initializeCategoryActivityIndicators();
        
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
     * Animate a game element out of its category
     * @param {HTMLElement} gameElement - The game element to animate out
     * @param {string} category - The category the game is leaving
     * @param {Function} onAnimationComplete - Callback after animation completes
     * @param {Object} options - Optional: { showMessage: boolean, messageReason: string, messageCategory: string }
     */
    animateGameOut(gameElement, category, onAnimationComplete, options = {}) {
        // Flash category to warn user first
        this.flashCategory(category);
        
        setTimeout(() => {
            // Show removal message if requested
            if (options.showMessage) {
                this.showRemovalMessage(gameElement, options.messageReason || 'filterMismatch', options.messageCategory || null);
            }
            
            // Start removal animation
            gameElement.classList.add('removing');
            
            // Update count when animation starts
            this.updateCategoryCountByCategory(category);
            
            // Call callback after animation completes
            setTimeout(() => {
                if (onAnimationComplete) {
                    onAnimationComplete();
                }
            }, this.ANIMATION_DURATION);
        }, this.FLASH_TO_ANIMATION_DELAY);
    }

    /**
     * Animate a game element into its category
     * @param {HTMLElement} gameElement - The game element to animate in
     * @param {HTMLElement} gamesContainer - The container to insert the game into
     * @param {string} category - The category the game is entering
     * @param {Function} onAnimationComplete - Callback after animation completes
     */
    animateGameIn(gameElement, gamesContainer, category, onAnimationComplete) {
        // Flash category to warn user first
        this.flashCategory(category);
        
        setTimeout(() => {
            // Insert game in ordered position
            this.insertGameInOrderedPosition(gameElement, gamesContainer);
            
            // Start entrance animation and update count together
            gameElement.classList.add('entering');
            this.updateCategoryCountByCategory(category);
            
            // Call callback after animation completes
            setTimeout(() => {
                gameElement.classList.remove('entering');
                if (onAnimationComplete) {
                    onAnimationComplete();
                }
            }, this.ANIMATION_DURATION);
        }, this.FLASH_TO_ANIMATION_DELAY);
    }

    /**
     * Insert a game element in the correct position based on sort order
     * TODO: When sort functionality is implemented, check sort value here
     * (e.g., from dataManager.getSort() or similar) to determine insertion position
     * Currently defaults to "most recently updated first" (insert at top)
     * 
     * @param {HTMLElement} gameElement - The game element to insert
     * @param {HTMLElement} gamesContainer - The container to insert into
     */
    insertGameInOrderedPosition(gameElement, gamesContainer) {
        // TODO: Get sort preference (e.g., const sort = this.dataManager?.getSort() || 'recent')
        // For now, default to "most recently updated first" (insert at top)
        if (gamesContainer.firstChild) {
            gamesContainer.insertBefore(gameElement, gamesContainer.firstChild);
        } else {
            gamesContainer.appendChild(gameElement);
        }
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
                // Animate out, then handle message and final removal
                this.animateGameOut(gameElement, category, () => {
                    // After animation completes, keep message visible for readable duration
                    // Transform game element to message-only state
                    this.transformToMessageOnly(gameElement);
                    
                    // Remove message after readable duration
                    setTimeout(() => {
                        gameElement.remove();
                        // Recompute category activity after removal
                        if (category) {
                            this.recomputeCategoryActivity(category);
                        }
                    }, this.REMOVAL_MESSAGE_DURATION);
                }, {
                    showMessage: true,
                    messageReason: reason
                });
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
        
        // Create element but don't add to DOM yet - will be added by animateGameIn
        const gameElement = this.createGameElement(game);
        
        // Animate game in
        this.animateGameIn(gameElement, gamesContainer, category, () => {
            // After animation completes, recompute category activity
            // (game starts with 0:0 activity, so this won't change anything initially,
            // but ensures consistency if activity updates come in before animation completes)
            this.recomputeCategoryActivity(category);
        });
        
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
        
        // Initialize activity indicators for newly added games (SVGs already populated in createGameElement)
        // But we need to ensure they're ready to receive activity updates
        // (createGameElement already creates indicators, so this is just for safety)
        
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
        
        // Recompute all category activity after redraw
        // (games may have been filtered, so activity totals may have changed)
        this.recomputeAllCategoryActivity();
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
            // Animate out from old category with message
            this.animateGameOut(gameElement, oldCategory, () => {
                // After removal animation completes, remove message and move to new category
                const messageElement = gameElement.querySelector('.removal-message');
                if (messageElement) {
                    messageElement.remove();
                }
                
                gameElement.classList.remove('removing');
                
                // Animate into new category
                this.animateGameIn(gameElement, newGamesContainer, newCategory, () => {
                    // Recompute activity for both old and new categories after move
                    if (oldCategory) {
                        this.recomputeCategoryActivity(oldCategory);
                    }
                    this.recomputeCategoryActivity(newCategory);
                });
            }, {
                showMessage: true,
                messageReason: 'categoryMoved',
                messageCategory: newCategory
            });
        } else {
            // No old category - just animate into new category
            this.animateGameIn(gameElement, newGamesContainer, newCategory, () => {
                // Recompute activity for new category after move
                this.recomputeCategoryActivity(newCategory);
            });
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
        const { gameId, browsing, writing } = activityData;
        
        // Look for game elements in the DOM first (more reliable than cache check)
        // Games might be in DOM even if not in cache (e.g., from template)
        const gameElements = this.container.querySelectorAll(`.dashboard-game-item[data-game-id="${gameId}"]`);
        
        if (gameElements.length === 0) {
            // Game not visible in dashboard - this is normal when:
            // - Game doesn't match current search/filters/categories
            // - Game was removed from view
            // - Game is in a different view
            // Silently ignore (activity updates broadcast for all games, not just visible ones)
            return;
        }
        
        // Game is visible - update activity indicators
        const hasActivity = (browsing > 0 || writing > 0);
        
        // Update ALL game elements with this game ID
        gameElements.forEach((gameElement, index) => {
            let existingIndicator = gameElement.querySelector('.game-activity-indicator');
            
            // If indicator doesn't exist, create it (shouldn't happen after initialization, but handle it)
            if (!existingIndicator) {
                console.warn('🎮 DashboardManager: Activity indicator missing for game', gameId, '- creating it');
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
            
        });
        
        console.log('🎮 DashboardManager: Updated', gameElements.length, 'activity indicators for game:', gameId, 'activity:', browsing, ':', writing);
        
        // Update category-level activity indicators (only if they exist)
        if (this.container.querySelector('.category-activity-indicator')) {
            this.updateCategoryActivityIndicators(gameId, browsing, writing);
        }
    }

    /**
     * Get the category for a game element
     * @param {HTMLElement} gameElement - The game element
     * @returns {string|null} The category path (e.g., "myStories.active") or null
     */
    getCategoryForGameElement(gameElement) {
        const gamesContainer = gameElement.parentElement;
        if (!gamesContainer) return null;
        
        const categoryHeader = gamesContainer.previousElementSibling;
        if (!categoryHeader) return null;
        
        return categoryHeader.dataset.category || null;
    }

    /**
     * Update category activity indicators based on a game's activity change
     * @param {string|number} gameId - The game ID
     * @param {number} browsing - Browsing count
     * @param {number} writing - Writing count
     */
    updateCategoryActivityIndicators(gameId, browsing, writing) {
        // Find all game elements with this game ID
        const gameElements = this.container.querySelectorAll(`.dashboard-game-item[data-game-id="${gameId}"]`);
        
        if (gameElements.length === 0) return;
        
        // Track which categories this game appears in
        const affectedCategories = new Set();
        
        gameElements.forEach(gameElement => {
            const category = this.getCategoryForGameElement(gameElement);
            if (category) {
                affectedCategories.add(category);
            }
        });
        
        // Update activity for each affected category
        affectedCategories.forEach(category => {
            // Get all games in this category
            const categoryHeader = this.container.querySelector(`[data-category="${category}"]`);
            if (!categoryHeader) return;
            
            const gamesContainer = categoryHeader.nextElementSibling;
            if (!gamesContainer) return;
            
            const gameItems = gamesContainer.querySelectorAll('.dashboard-game-item');
            
            // Sum up activity from all games in this category
            let totalBrowsing = 0;
            let totalWriting = 0;
            
            gameItems.forEach(gameItem => {
                const gameItemId = gameItem.dataset.gameId;
                if (!gameItemId) return;
                
                // Get current activity for this game from its indicator
                const gameIndicator = gameItem.querySelector('.game-activity-indicator');
                if (gameIndicator) {
                    const activityNumbers = gameIndicator.querySelector('.activity-numbers');
                    if (activityNumbers) {
                        const [b, w] = activityNumbers.textContent.split(':').map(n => parseInt(n) || 0);
                        totalBrowsing += b;
                        totalWriting += w;
                    }
                }
            });
            
            // Update the category activity indicator
            this.updateCategoryActivityIndicator(category, totalBrowsing, totalWriting);
        });
    }

    /**
     * Update a specific category's activity indicator
     * @param {string} category - The category path (e.g., "myStories.active")
     * @param {number} browsing - Total browsing count for the category
     * @param {number} writing - Total writing count for the category
     */
    updateCategoryActivityIndicator(category, browsing, writing) {
        const categoryHeader = this.container.querySelector(`[data-category="${category}"]`);
        if (!categoryHeader) return;
        
        const indicator = categoryHeader.querySelector('.category-activity-indicator');
        if (!indicator) return;
        
        // Update activity numbers
        const activityNumbers = indicator.querySelector('.activity-numbers');
        if (activityNumbers) {
            activityNumbers.textContent = `${browsing || 0}:${writing || 0}`;
        }
        
        // Update activity state classes
        const hasActivity = (browsing > 0 || writing > 0);
        indicator.classList.toggle('has-activity', hasActivity);
        indicator.classList.toggle('no-activity', !hasActivity);
    }

    /**
     * Initialize activity indicators for all games already in the DOM
     * (Games rendered from template don't have indicators, so we add them here)
     */
    initializeGameActivityIndicators() {
        const gameElements = this.container.querySelectorAll('.dashboard-game-item');
        const svgElements = [];
        
        gameElements.forEach(gameElement => {
            const gameId = gameElement.dataset.gameId;
            if (!gameId) return;
            
            // Check if indicator already exists
            let indicator = gameElement.querySelector('.game-activity-indicator');
            if (!indicator) {
                // Create indicator with initial 0:0 activity
                indicator = this.createActivityIndicator(gameId, 0, 0);
                gameElement.appendChild(indicator);
                
                // Collect SVG element for population
                const iconElement = indicator.querySelector('.icon[data-svg]');
                if (iconElement) {
                    svgElements.push(iconElement);
                }
            }
        });
        
        // Populate all SVGs at once
        if (svgElements.length > 0) {
            eventBus.emit('populateSvgs', { elements: svgElements });
            console.log('🎮 DashboardManager: Initialized', svgElements.length, 'game activity indicators');
        }
    }

    /**
     * Initialize category activity indicators (populate SVGs)
     */
    initializeCategoryActivityIndicators() {
        const indicators = this.container.querySelectorAll('.category-activity-indicator');
        const svgElements = [];
        
        indicators.forEach(indicator => {
            const iconElement = indicator.querySelector('.icon[data-svg]');
            if (iconElement) {
                svgElements.push(iconElement);
            }
        });
        
        if (svgElements.length > 0) {
            eventBus.emit('populateSvgs', { elements: svgElements });
        }
        
        // Also compute initial category activity from visible games
        this.recomputeAllCategoryActivity();
    }

    /**
     * Recompute activity for a specific category based on current game indicators
     * @param {string} category - The category path (e.g., "myStories.active")
     */
    recomputeCategoryActivity(category) {
        const categoryHeader = this.container.querySelector(`[data-category="${category}"]`);
        if (!categoryHeader) return;
        
        const gamesContainer = categoryHeader.nextElementSibling;
        if (!gamesContainer) return;
        
        const gameItems = gamesContainer.querySelectorAll('.dashboard-game-item');
        
        let totalBrowsing = 0;
        let totalWriting = 0;
        
        gameItems.forEach(gameItem => {
            const gameIndicator = gameItem.querySelector('.game-activity-indicator');
            if (gameIndicator) {
                const activityNumbers = gameIndicator.querySelector('.activity-numbers');
                if (activityNumbers) {
                    const [b, w] = activityNumbers.textContent.split(':').map(n => parseInt(n) || 0);
                    totalBrowsing += b;
                    totalWriting += w;
                }
            }
        });
        
        this.updateCategoryActivityIndicator(category, totalBrowsing, totalWriting);
    }

    /**
     * Recompute activity for all categories based on current game indicators
     */
    recomputeAllCategoryActivity() {
        const categoryHeaders = this.container.querySelectorAll('.category-header');
        
        categoryHeaders.forEach(header => {
            const category = header.dataset.category;
            if (category) {
                this.recomputeCategoryActivity(category);
            }
        });
    }

}
