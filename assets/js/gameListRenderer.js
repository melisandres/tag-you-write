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
        const tooltipContributor = hasContributed ? 'data-i18n-tooltip="tooltips.contributor"' : '';

        // build the game card
        return `
            <div class="story ${isOpen ? '' : 'closed'}" 
                 data-game-id="${game.game_id}" 
                 data-unseen-count="${game.unseen_count}" 
                 data-seen-count="${game.seen_count}" 
                 data-text-count="${game.text_count}" 
                 data-text-id="${game.id || game.text_id}">
                <div class="story-title ${game.unseen_count > 0 && this.userLoggedIn ? 'unreads' : ''}">
                    <h2 class="${hasContributed ? 'contributed' : ''}" ${tooltipContributor}>
                        <a data-refresh-default ${untitledDataI18n} data-text-id="${game.id || game.text_id}">
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
        const treeTooltip = window.i18n.translate('general.view_tree_tooltip');
        const shelfTooltip = window.i18n.translate('general.view_shelf_tooltip');

        return `
            ${this.userLoggedIn ? `
                <button data-bookmark-story data-text-id="${game.id}" class="story-btn bookmark-btn" data-svg="bookmark" data-i18n-title="general.bookmark_tooltip" title="${bookmarkTooltip}">
                    <span class="icon" data-svg="bookmark">${SVGManager.bookmarkSVG}</span>
                </button>
            ` : ''}
            <button data-refresh-tree data-text-id="${game.id || game.text_id}" class="story-btn" data-svg="tree" data-i18n-title="general.view_tree_tooltip" title="${treeTooltip}">
                <span class="icon" data-svg="tree">${SVGManager.treeSVG}</span>
            </button>
            <button data-refresh-shelf data-text-id="${game.id || game.text_id}" class="story-btn" data-svg="shelf" data-i18n-title="general.view_shelf_tooltip" title="${shelfTooltip}">
                <span class="icon" data-svg="shelf">${SVGManager.shelfSVG}</span>
            </button>
        `;
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
        const contributedElement = gameElement.querySelector('.contributed');
        if (contributedElement) {
            contributedElement.classList.toggle('contributed', hasContributed);
            contributedElement.setAttribute('data-i18n-tooltip', hasContributed ? 'tooltips.contributor' : '');
        }

        // Update counts
        gameElement.dataset.unseenCount = gameData.unseen_count;
        gameElement.dataset.seenCount = gameData.seen_count;
        gameElement.dataset.textCount = gameData.text_count;

        // Update title and unreads status
        const titleDiv = gameElement.querySelector('.story-title');
        if (titleDiv && this.userLoggedIn) {
            titleDiv.classList.toggle('unreads', gameData.unseen_count > 0);
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
        const showcaseEl = document.querySelector("#showcase");
        if (!showcaseEl) {
            console.log("No showcase element found");
            return;
        }

        // Get existing state
        const refreshManager = window.refreshManagerInstance;
        if (!refreshManager) return;

        // Update only the showcase portion of the state
        refreshManager.setShowcaseState({
            type: showcaseEl.dataset.showcase,
            rootStoryId: showcaseEl.closest('[data-text-id]')?.dataset.textId,
        });

         // Capture transform separately if it's a tree view
        if (showcaseEl.dataset.showcase === 'tree') {
            refreshManager.captureD3Transform();
        }

        // TODO: Make sure this is good. Capture open drawers if it's a shelf view
        if (showcaseEl.dataset.showcase === 'shelf') {
            const openDrawers = Array.from(document.querySelectorAll('.writing:not(.hidden)'))
                .map(drawer => drawer.closest('[data-story-id]')?.dataset.storyId)
                .filter(Boolean);
                
            refreshManager.setShowcaseState({
                type: showcaseEl.dataset.showcase,
                rootStoryId: showcaseEl.closest('[data-text-id]')?.dataset.textId,
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
