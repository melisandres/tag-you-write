import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

export class GameListRenderer {
    constructor(container, uiManager) {
        if (!container) return;
        
        this.dataManager = window.dataManager;
        this.initialLoadComplete = false;
        this.container = container;
        this.uiManager = uiManager;
        
        // Get user ID from meta tag or data attribute
        const userDataElement = document.querySelector('meta[name="user"]');
        if (userDataElement) {
            this.userLoggedIn = userDataElement.dataset.guest === 'false';
        }

        // Get bookmark SVG from the page if it exists
        const svgTemplate = document.getElementById('bookmark-svg');
        this.bookmarkSVG = svgTemplate ? svgTemplate.innerHTML : '';

        this.initializeFromServerData();
        
        // DEPRECATED: Old event system replaced by some logic in the GamesModifiedHandler class
        // Listen for game updates
/*         eventBus.on('updateGame', (gameData) => this.updateExistingGame(gameData)); */

        // Add state tracking
        this.currentViewState = null;

        // Listen for filter updates
        eventBus.on('filterApplied', () => this.saveCurrentViewState());
        eventBus.on('gamesListUpdated', () => this.restoreViewState());

        // DEPRECATED: Old event system replaced by the handleGamesModified method in the GamesModifiedHandler class
        // The functionality has been moved to the GamesModifiedHandler class
        // eventBus.on('gamesModified', (games) => this.handleGamesModified(games));

        // Add listener for search updates
        eventBus.on('searchApplied', (searchTerm) => {
            this.saveCurrentViewState();
            // This will trigger list refresh, which includes showcase redraw
            this.refreshGamesList().then(() => {
                // After everything is redrawn, apply highlights
                this.handleSearchHighlighting(searchTerm);
            });
        });
        
        // Add listener for new games
        eventBus.on('gameAddedToRender', (game) => this.insertNewGame(game));
    }

    initializeFromServerData() {
        const gamesData = this.loadGamesData();
        if (gamesData) {
            this.dataManager.updateGamesData(gamesData, true);
            //this.dataManager.initializeGamesData(gamesData);
        }
        this.initialLoadComplete = true;

        // Check if gamesData is empty and display message
        if (!gamesData || gamesData.length === 0) {
            const message = window.i18n.translate('games.noGamesMessage');
            this.container.insertAdjacentHTML('beforeend', `<p class="no-games" data-i18n="games.noGamesMessage">${message}</p>`);
        }
    }

    // DEPRECATED: This method has been moved to the GamesModifiedHandler class
    // handleGamesModified(games) {
    //     console.log('Handling modified games in renderer:', games);
    //     // update the games cache
    //     this.dataManager.updateGamesData(games, false);
    // 
    //     games.forEach(game => {
    //         const gameElement = document.querySelector(`.story[data-game-id="${game.game_id}"]`);
    //         if (gameElement) {
    //             // Update existing game
    //             this.updateExistingGame(gameElement, game);
    //         } else {
    //             // Insert new game in correct position
    //             this.insertNewGame(game);
    //         }
    //     });
    // }

    loadGamesData() {
        const dataElement = document.getElementById('games-data');
        if (dataElement) {
            try {
                return JSON.parse(dataElement.textContent);
            } catch (e) {
                console.error('Error parsing games data:', e);
                return null;
            }
        }
        return null;
    }

    // TODO: This is where the modal was being called.
    // All your existing render methods
    renderGameCard(game) {
        const isOpen = game.openForChanges === '1' || game.openForChanges === true || game.openForChanges === 1;
        const hasContributed = game.hasContributed === '1' || game.hasContributed === true || game.hasContributed === 1;

        // translate the strings
        const untitledText = window.i18n ? window.i18n.translate("general.untitled") : "Untitled";
        const untitledDataI18n = game.title ? '' : 'data-i18n="general.untitled"';
        const translatedTooltip = window.i18n ? window.i18n.translate('tooltips.contributor') : '☆ contributor';

        // build the game card
        return `
            <div class="story ${isOpen ? '' : 'closed'}${game.hasTemporaryAccess ? ' has-temporary-access' : ''}" 
                 data-game-id="${game.game_id}" 
                 data-unseen-count="${game.unseen_count}" 
                 data-seen-count="${game.seen_count}" 
                 data-text-count="${game.text_count}" 
                 data-text-id="${game.id || game.text_id}">
                ${game.hasTemporaryAccess ? `
                <div class="temporary-access-banner">
                    <div class="banner-text" data-i18n="${this.userLoggedIn ? 'invitation.temporary_access_banner' : 'invitation.temporary_access_banner_not_logged_in'}">
                        ${window.i18n.translate(this.userLoggedIn ? 'invitation.temporary_access_banner' : 'invitation.temporary_access_banner_not_logged_in')}
                    </div>
                    ${this.userLoggedIn ? `
                    <button class="link-button" data-action="link-invitation" data-game-id="${game.game_id}" data-token="${game.invitation_token || ''}" data-i18n="invitation.link_to_account" title="${window.i18n.translate('invitation.link_to_account')}">
                        <span class="icon" data-svg="linkGameToAccount">${SVGManager.linkGameToAccount}</span>
                        ${window.i18n.translate('invitation.link_to_account')}
                    </button>
                    ` : ''}
                </div>
                ` : ''}
                <div class="story-title ${game.unseen_count > 0 && this.userLoggedIn ? 'unreads' : ''}" data-refresh-default data-text-id="${game.id || game.text_id}">
                    <h2>
                        ${hasContributed ? `<span class="contributor-star" data-svg="star" data-i18n-tooltip="tooltips.contributor" data-tooltip-text="${translatedTooltip}"></span>` : ''}
                        <a data-text-id="${game.id || game.text_id}" ${untitledDataI18n}>
                            ${game.title || untitledText}
                        </a>
                    </h2>
                </div>
                <div class="story-btns">
                    ${this.renderStoryButtons(game)}
                </div>
                <div class="story-writing">
                    ${this.renderGameStatus(game)}
                    ${game.prompt ? this.renderPrompt(game.prompt) : ''}
                </div>
            </div>
        `;
    }

    renderStoryButtons(game) {
        //translate the tooltips
        const bookmarkTooltip = window.i18n.translate('general.bookmark_tooltip');
        const activityTooltip = window.i18n.translate('activity.editingVsBrowsing');
        const privacyInfo = this.getPrivacyInfo(game);

        return `
            ${this.userLoggedIn ? `
                <button data-bookmark-story data-text-id="${game.id || game.text_id}" class="story-btn bookmark-btn ${game.isBookmarked ? 'bookmarked' : ''}" data-svg="bookmark" data-i18n-title="general.bookmark_tooltip" title="${bookmarkTooltip}">
                    <span class="icon" data-svg="bookmark">${SVGManager.bookmarkSVG}</span>
                </button>
            ` : ''}
            <div class="story-btn game-activity-indicator ${this.getActivityState(game)}" data-i18n-title="activity.editingVsBrowsing" title="${activityTooltip}" data-game-id="${game.game_id}">
                <span class="icon" data-svg="user">${SVGManager.userSVG}</span>
                <div class="activity-numbers">${this.getActivityNumbers(game)}</div>
            </div>
            <div class="story-btn privacy-indicator" data-i18n-title="${privacyInfo.tooltipKey}" title="${privacyInfo.tooltip}" data-svg="${privacyInfo.svg}">
                ${privacyInfo.svgContent}
            </div>
        `;
    }

    // Helper method to determine privacy level and return appropriate info
    getPrivacyInfo(game) {
        const visibleToAll = game.visible_to_all === '1' || game.visible_to_all === 1 || game.visible_to_all === true;
        const joinableByAll = game.joinable_by_all === '1' || game.joinable_by_all === 1 || game.joinable_by_all === true;

        if (visibleToAll && joinableByAll) {
            // Public - anyone can view and join
            return {
                svg: 'public',
                svgContent: SVGManager.publicSVG,
                tooltipKey: 'general.privacy_public_tooltip',
                tooltip: window.i18n.translate('general.privacy_public_tooltip')
            };
        } else if (visibleToAll && !joinableByAll) {
            // Public, invite-only - anyone can view, only invited can join
            return {
                svg: 'locked',
                svgContent: SVGManager.lockedSVG,
                tooltipKey: 'general.privacy_locked_tooltip',
                tooltip: window.i18n.translate('general.privacy_locked_tooltip')
            };
        } else {
            // Private - only invited can view and join
            return {
                svg: 'invisible',
                svgContent: SVGManager.invisibleSVG,
                tooltipKey: 'general.privacy_invisible_tooltip',
                tooltip: window.i18n.translate('general.privacy_invisible_tooltip')
            };
        }
    }

    renderGameStatus(game) {
        const isOpen = game.openForChanges === '1' || game.openForChanges === true || game.openForChanges === 1;
        let status = game.pending ? 'pending' : (isOpen ? 'open' : 'closed');
        //let statusText = status.toUpperCase();
        
        const gameText = window.i18n.translate('general.game');
        const statusText = window.i18n.translate(`general.${status}`);


        return `
            <div class="game-status-indicator ${status}">
                <p class="game-status">    
                    <span data-i18n="general.game">${gameText}</span>
                    <span data-i18n="general.open">${statusText}</span>  
                </p>
            </div>
        `;
    }

    renderPrompt(prompt) {
        const promptText = window.i18n.translate('cr_it_ed.prompt');
        return `
            <div class="story-prompt">
                <h3 class="prompt-title very-small" data-i18n="cr_it_ed.prompt">
                    ${promptText}
                </h3>
                <p>
                    ${prompt}
                </p>
            </div>
        `;
    }

    getActivityState(game) {
        // Get activity data from the activity data manager
        const activityData = this.getGameActivityData(game.game_id);
        const browsing = activityData?.browsing || 0;
        const writing = activityData?.writing || 0;
        
        return (browsing > 0 || writing > 0) ? 'has-activity' : 'no-activity';
    }

    getActivityNumbers(game) {
        // Get activity data from the activity data manager
        const activityData = this.getGameActivityData(game.game_id);
        const browsing = activityData?.browsing || 0;
        const writing = activityData?.writing || 0;
        
        return `${browsing}:${writing}`;
    }

    getGameActivityData(gameId) {
        // Try to get activity data from UserActivityDataManager (new system)
        if (window.userActivityDataManager) {
            const activity = window.userActivityDataManager.getGameActivity(gameId);
            if (activity) {
                console.log(`🎮 GameListRenderer: Got activity for game ${gameId}:`, activity);
                return activity;
            } else {
                console.log(`🎮 GameListRenderer: No activity found for game ${gameId}`);
            }
        }
        
        // Final fallback to placeholder data
        console.log(`🎮 GameListRenderer: Using placeholder data for game ${gameId}`);
        return { browsing: 0, writing: 0 };
    }

    // Insert new game in correct position
    insertNewGame(gameData) {
        const newGameElement = this.renderGameCard(gameData);
        const placementIndex = gameData.placement_index;
        
        // Find correct position based on placement index
        const existingGames = Array.from(this.container.children);
        const insertIndex = existingGames.findIndex(game => {
            const gameElement = game.closest('.story');
            if (!gameElement) return false;
            const currentGame = this.dataManager.getGame(gameElement.dataset.gameId);
            return currentGame && currentGame.placement_index > placementIndex;
        });
        
        // Insert at correct position or at end
        if (insertIndex === -1) {
            this.container.insertAdjacentHTML('beforeend', newGameElement);
        } else {
            existingGames[insertIndex].insertAdjacentHTML('beforebegin', newGameElement);
        }

        // Populate SVGs for the newly inserted element
        if (this.uiManager && this.uiManager.populateSvgsInContainer) {
            this.uiManager.populateSvgsInContainer(this.container);
        }

        // Reapply search highlighting if there's an active search
        const activeSearch = this.dataManager.getSearch();
        if (activeSearch) {
            this.handleSearchHighlighting(activeSearch);
        }
    }

    // Update a game already rendered in the list
    updateExistingGame(gameElement, gameData) {
        console.log("updateExistingGame", gameData);
        if (!gameElement || !gameData) return;

        // Update open/closed status and hasContributed status
        const isOpen = gameData.openForChanges === '1' || gameData.openForChanges === true || gameData.openForChanges === 1;
        console.log("isOpen", isOpen);
        const hasContributed = gameData.hasContributed === '1' || gameData.hasContributed === true || gameData.hasContributed === 1;

        // Update story class for open/closed status
        const gameStatusIndicator = gameElement.querySelector('.game-status-indicator');

        // Update the game status indicator CSS class
        gameStatusIndicator.classList.toggle('open', isOpen);
        gameStatusIndicator.classList.toggle('closed', !isOpen);

        // Update the game status text
        const gameText = window.i18n.translate('general.game');
        if (isOpen) {
            const openText = window.i18n.translate('general.open');
            gameStatusIndicator.querySelector('.game-status').innerHTML = 
                `<span data-i18n="general.game">${gameText}</span>
                <span data-i18n="general.open">${openText}</span>`;
        } else {
            const closedText = window.i18n.translate('general.closed');
            gameStatusIndicator.querySelector('.game-status').innerHTML = 
                `<span data-i18n="general.game">${gameText}</span>
                <span data-i18n="general.closed">${closedText}</span>`;
        }

        // Update hasContributed status
        const h2Element = gameElement.querySelector('.story-title h2');
        if (h2Element) {
            const existingContributorStar = h2Element.querySelector('.contributor-star');
            
            if (hasContributed && !existingContributorStar) {
                // Add contributor star if user now has contributed
                const translatedTooltip = window.i18n ? window.i18n.translate('tooltips.contributor') : '☆ contributor';
                const starElement = document.createElement('span');
                starElement.className = 'contributor-star';
                starElement.setAttribute('data-svg', 'star');
                starElement.setAttribute('data-i18n-tooltip', 'tooltips.contributor');
                starElement.setAttribute('data-tooltip-text', translatedTooltip);
                h2Element.insertBefore(starElement, h2Element.firstChild);
                
                // Populate the SVG content using the consistent approach
                if (this.uiManager && this.uiManager.populateSvgs) {
                    this.uiManager.populateSvgs([starElement]);
                }
            } else if (!hasContributed && existingContributorStar) {
                // Remove contributor star if user no longer has contributed
                existingContributorStar.remove();
            } else if (hasContributed && existingContributorStar) {
                // Update existing star's tooltip
                const translatedTooltip = window.i18n ? window.i18n.translate('tooltips.contributor') : '☆ contributor';
                existingContributorStar.setAttribute('data-tooltip-text', translatedTooltip);
            }
        }

        // Update counts
        gameElement.dataset.unseenCount = gameData.unseen_count;
        gameElement.dataset.seenCount = gameData.seen_count;
        gameElement.dataset.textCount = gameData.text_count;

        // Update privacy settings
        const privacyIndicator = gameElement.querySelector('.privacy-indicator');
        if (privacyIndicator) {
            const privacyInfo = this.getPrivacyInfo(gameData);
            
            // Update the data-svg attribute
            privacyIndicator.setAttribute('data-svg', privacyInfo.svg);
            
            // Update the tooltip
            privacyIndicator.setAttribute('data-i18n-title', privacyInfo.tooltipKey);
            privacyIndicator.setAttribute('title', privacyInfo.tooltip);
            
            // Update the SVG content
            privacyIndicator.innerHTML = privacyInfo.svgContent;
        }

        // Update title and unreads status
        const titleDiv = gameElement.querySelector('.story-title');
        if (titleDiv && this.userLoggedIn) {
            titleDiv.classList.toggle('unreads', gameData.unseen_count > 0);
        }

        // Update temporary access banner
        const hasTemporaryAccess = gameData.hasTemporaryAccess === '1' || 
                                  gameData.hasTemporaryAccess === true || 
                                  gameData.hasTemporaryAccess === 1;
        const existingBanner = gameElement.querySelector('.temporary-access-banner');
        
        // Update the story class for temporary access
        gameElement.classList.toggle('has-temporary-access', hasTemporaryAccess);
        
        if (hasTemporaryAccess && !existingBanner) {
            // Add banner if game now has temporary access
            const bannerElement = document.createElement('div');
            bannerElement.className = 'temporary-access-banner';
            
            const bannerText = document.createElement('div');
            bannerText.className = 'banner-text';
            const bannerKey = this.userLoggedIn ? 'invitation.temporary_access_banner' : 'invitation.temporary_access_banner_not_logged_in';
            bannerText.setAttribute('data-i18n', bannerKey);
            bannerText.textContent = window.i18n.translate(bannerKey);
            
            if (this.userLoggedIn) {
                const linkButton = document.createElement('button');
                linkButton.className = 'link-button';
                linkButton.setAttribute('data-action', 'link-invitation');
                linkButton.setAttribute('data-game-id', gameData.game_id);
                linkButton.setAttribute('data-token', gameData.invitation_token || '');
                linkButton.setAttribute('data-i18n', 'invitation.link_to_account');
                linkButton.setAttribute('title', window.i18n.translate('invitation.link_to_account'));
                
                const iconSpan = document.createElement('span');
                iconSpan.className = 'icon';
                iconSpan.setAttribute('data-svg', 'linkGameToAccount');
                iconSpan.innerHTML = SVGManager.linkGameToAccount;
                
                linkButton.appendChild(iconSpan);
                linkButton.appendChild(document.createTextNode(window.i18n.translate('invitation.link_to_account')));
                
                bannerElement.appendChild(bannerText);
                bannerElement.appendChild(linkButton);
            } else {
                bannerElement.appendChild(bannerText);
            }
            
            gameElement.insertBefore(bannerElement, gameElement.firstChild);
        } else if (!hasTemporaryAccess && existingBanner) {
            // Remove banner if game no longer has temporary access
            existingBanner.remove();
        }

        // Reapply highlighting if there's an active search
        const activeSearch = this.dataManager.getSearch();
        if (activeSearch) {
            this.handleSearchHighlighting(activeSearch);
        }
    }

    renderGamesList(games) {
        if (!Array.isArray(games)) {
            console.error('Expected array of games, got:', games);
            return;
        }

        // Clear existing content
        this.container.innerHTML = '';

        // Message if the games list is empty
        if (games.length === 0) {
            const message = window.i18n.translate('games.noGamesMessage');
            this.container.insertAdjacentHTML('beforeend', `<p class="no-games" data-i18n="games.noGamesMessage">${message}</p>`);
            return;
        }
        
        // Render the games
        games.forEach(game => {
            const gameCard = this.renderGameCard(game);
            this.container.insertAdjacentHTML('beforeend', gameCard);
        });

        // Populate SVGs for all newly rendered elements
        if (this.uiManager && this.uiManager.populateSvgsInContainer) {
            this.uiManager.populateSvgsInContainer(this.container);
        }

        // Emit event after rendering is complete
        eventBus.emit('gamesListUpdated');

        // After rendering, apply any active search highlighting
        const activeSearch = this.dataManager.getSearch();
        if (activeSearch) {
            this.handleSearchHighlighting(activeSearch);
        }
    }

    saveCurrentViewState() {
        console.log("Starting saveCurrentViewState");
        const showcaseWrapper = document.querySelector("#showcase-wrapper");
        if (!showcaseWrapper) {
            console.log("No showcase wrapper found");
            return;
        }

        // Get existing state
        const refreshManager = window.refreshManagerInstance;
        if (!refreshManager) return;

        // Update only the showcase portion of the state
        refreshManager.setShowcaseState({
            type: showcaseWrapper.dataset.showcase,
            rootStoryId: showcaseWrapper.closest('[data-text-id]')?.dataset.textId,
        });

         // Capture transform separately if it's a tree view
        if (showcaseWrapper.dataset.showcase === 'tree') {
            refreshManager.captureD3Transform();
        }

        // TODO: Make sure this is good. Capture open drawers if it's a shelf view
        if (showcaseWrapper.dataset.showcase === 'shelf') {
            const openDrawers = Array.from(document.querySelectorAll('.writing:not(.hidden)'))
                .map(drawer => drawer.closest('[data-story-id]')?.dataset.storyId)
                .filter(Boolean);
                
            refreshManager.setShowcaseState({
                type: showcaseWrapper.dataset.showcase,
                rootStoryId: showcaseWrapper.closest('[data-text-id]')?.dataset.textId,
                drawers: openDrawers
            });
        }
    }

    async restoreViewState() {
        const savedState = JSON.parse(localStorage.getItem('pageState'));
        if (!savedState?.showcase?.rootStoryId) {
            console.log("No valid view state to restore");
            return;
        }

        const showcase = savedState.showcase;
        const container = this.uiManager.createShowcaseContainer(showcase.rootStoryId);
        if (!container) {
            console.log("Failed to create showcase container");
            return;
        }

        if (showcase.type === 'tree') {
            window.skipInitialTreeTransform = true;
            await this.uiManager.drawTree(showcase.rootStoryId, container);
            
            if (showcase.transform) {
                const svg = d3.select('#showcase svg');
                if (!svg.empty() && window.treeVisualizerInstance?.zoom) {
                    const transform = showcase.transform;
                    const newTransform = d3.zoomIdentity
                        .translate(transform.x, transform.y)
                        .scale(transform.k);
                    svg.call(window.treeVisualizerInstance.zoom.transform, newTransform);
                }
            }
            window.skipInitialTreeTransform = false;
        } else if (showcase.type === 'shelf') {
            await this.uiManager.drawShelf(showcase.rootStoryId, container);
        }
    }

    restoreDrawers(drawers) {
        drawers.forEach(storyId => {
            const drawer = this.container.querySelector(`[data-story-id="${storyId}"] .writing`);
            if (drawer) {
                drawer.classList.add('visible');
                drawer.classList.remove('hidden');
                const arrow = drawer.closest('.node').querySelector(".arrow");
                if (arrow) {
                    arrow.classList.add('open');
                    arrow.classList.add('arrow-down')
                    arrow.classList.remove('closed');
                    arrow.classList.remove('arrow-right');
                }
            }
        });
    }

    handleSearchHighlighting(searchTerm) {
        if (!searchTerm) {
            eventBus.emit('removeSearchHighlights', this.container);
            return;
        }

        // Now safe to highlight both list and showcase as they're fully rendered
        eventBus.emit('highlightSearchMatches', {
            container: this.container,
            searchTerm: searchTerm
        });
    }

    //TODO: wtf is this? 
    async refreshGamesList() {
        // ... existing refresh code ...
        
        // After list and showcase are redrawn
        await this.restoreViewState();
        
        // Signal that all drawing is complete
        eventBus.emit('gamesListRefreshComplete');
    }
}
