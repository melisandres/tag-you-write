import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';


export class GameListRenderer {
    constructor(container, path, uiManager) {
        if (!container) return;
        
        this.path = path;
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
        
        // Listen for game updates
/*         eventBus.on('updateGame', (gameData) => this.updateGameElement(gameData)); */

        // Add state tracking
        this.currentViewState = null;

        // Listen for filter updates
        eventBus.on('filterApplied', () => this.saveCurrentViewState());
        eventBus.on('gamesListUpdated', () => this.restoreViewState());

        // Add event listener for game updates
        eventBus.on('gamesModified', (games) => this.handleGamesModified(games));
    }

    initializeFromServerData() {
        const gamesData = this.loadGamesData();
        if (gamesData) {
            this.dataManager.initializeGamesData(gamesData);
        }
        this.initialLoadComplete = true;

        // Check if gamesData is empty and display message
        if (!gamesData || gamesData.length === 0) {
            this.container.insertAdjacentHTML('beforeend', '<p class="no-games">No games found matching your current filters</p>');
        }
    }

    handleGamesModified(games) {
        console.log('Handling modified games in renderer:', games);
        games.forEach(game => {
            const gameElement = document.querySelector(`[data-game-id="${game.game_id}"]`);
            if (gameElement) {
                // Update existing game
                this.updateExistingGame(gameElement, game);
            } else {
                // Insert new game in correct position
                this.insertNewGame(game);
            }
        });
    }

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

    // All your existing render methods
    renderGameCard(game) {
        const isOpen = game.openForChanges === '1' || game.openForChanges === true;
        const hasContributed = game.hasContributed === '1' || game.hasContributed === true;

        console.log("userLoggedIn", this.userLoggedIn);
        console.log("game unseens", game.unseen_count);
        console.log("game useen > 0", game.seen_count > 0);
        
        return `
            <div class="story ${isOpen ? '' : 'closed'}" 
                 data-game-id="${game.game_id}" 
                 data-unseen-count="${game.unseen_count}" 
                 data-seen-count="${game.seen_count}" 
                 data-text-count="${game.text_count}" 
                 data-text-id="${game.id}">
                <div class="story-title ${game.unseen_count > 0 && this.userLoggedIn ? 'unreads' : ''}">
                    <h2 class="${hasContributed ? 'contributed' : ''}">
                        <a data-refresh-modal data-text-id="${game.id}">
                            ${game.title || 'Untitled'}
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
        return `
            ${this.userLoggedIn ? `
                <button data-bookmark-story data-text-id="${game.id}" class="story-btn bookmark-btn" data-svg="bookmark">
                    ${SVGManager.bookmarkSVG}
                </button>
            ` : ''}
            <button data-refresh-tree data-text-id="${game.id}" class="story-btn" data-svg="tree">
                <img class="refresh-tree" src="${this.path}assets/imgs/icons/tree.svg" alt="view tree">
            </button>
            <button data-refresh-shelf data-text-id="${game.id}" class="story-btn" data-svg="shelf">
                <img class="refresh-shelf" src="${this.path}assets/imgs/icons/shelf.svg" alt="view shelf"> 
            </button>
        `;
    }

    renderGameStatus(game) {
        const isOpen = game.openForChanges === '1' || game.openForChanges === true;
        let status = game.pending ? 'pending' : (isOpen ? 'open' : 'closed');
        let statusText = status.toUpperCase();
        
        return `
            <div class="game-status-indicator ${status}">
                <p class="game-status">    
                    <span>GAME</span>
                    <span>${statusText}</span>  
                </p>
            </div>
        `;
    }

    renderPrompt(prompt) {
        return `
            <div class="story-prompt">
                <h3 class="prompt-title very-small">
                    prompt:
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
        const gameId = gameData.game_id;
        
        // Find correct position based on game ID
        const existingGames = Array.from(this.container.children);
        const insertIndex = existingGames.findIndex(game => 
            parseInt(game.dataset.gameId) > gameId
        );
        
        // Insert at correct position or at end
        if (insertIndex === -1) {
            this.container.insertAdjacentHTML('beforeend', newGameElement);
        } else {
            existingGames[insertIndex].insertAdjacentHTML('beforebegin', newGameElement);
        }
    }

    updateExistingGame(gameElement, gameData) {
        console.log("HERE!!updateExistingGame", gameData);
        if (!gameElement || !gameData) return;

        // Update open/closed status and hasContributed status
        const isOpen = gameData.openForChanges === '1' || gameData.openForChanges === true;
        console.log("isOpen", isOpen);
        const hasContributed = gameData.hasContributed === '1' || gameData.hasContributed === true;

        // Update story class for open/closed status
        const gameStatusIndicator = gameElement.querySelector('.game-status-indicator');
        if (isOpen) {
            gameStatusIndicator.classList.remove('closed');
            gameStatusIndicator.classList.add('open');
            // TODO update the game status text
            gameStatusIndicator.querySelector('.game-status').innerHTML = `<span>GAME</span>
                        <span>OPEN</span>`;
        } else {
            gameStatusIndicator.classList.add('closed');
            gameStatusIndicator.classList.remove('open');
            // TODO update the game status text
            gameStatusIndicator.querySelector('.game-status').innerHTML = `<span>GAME</span>
                        <span>CLOSED</span>`;
        }

        // Update hasContributed status? For now its done locally.

        // Update counts
        gameElement.dataset.unseenCount = gameData.unseen_count;
        gameElement.dataset.seenCount = gameData.seen_count;
        gameElement.dataset.textCount = gameData.text_count;

        // Update title and unreads status
        const titleDiv = gameElement.querySelector('.story-title');
        if (titleDiv && this.userLoggedIn) {
            titleDiv.classList.toggle('unreads', gameData.unseen_count > 0);
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
            this.container.insertAdjacentHTML('beforeend', '<p class="no-games">No games found matching your current filters</p>');
            return;
        }
        
        // Render the games
        games.forEach(game => {
            const gameCard = this.renderGameCard(game);
            this.container.insertAdjacentHTML('beforeend', gameCard);
        });

        // Emit event after rendering is complete
        eventBus.emit('gamesListUpdated');
    }

    saveCurrentViewState() {
        console.log("Starting saveCurrentViewState");
        const showcaseEl = document.querySelector("#showcase");
        if (!showcaseEl) {
            console.log("No showcase element found");
            return;
        }

        const viewState = {
            textId: showcaseEl.closest('[data-text-id]')?.dataset.textId,
            viewType: showcaseEl.dataset.showcase,
            drawers: []
        };

        if (viewState.viewType === 'tree') {
            const svg = d3.select('#showcase svg');
            if (!svg.empty()) {
                const svgNode = svg.node();
                const transform = d3.zoomTransform(svgNode);
                viewState.zoomTransform = {
                    x: transform.x,
                    y: transform.y,
                    k: transform.k
                };
            }
        }

        // Save to RefreshManager's state
        window.refreshManagerInstance.state.viewState = viewState;
        localStorage.setItem('pageState', JSON.stringify(window.refreshManagerInstance.state));
    }

    async restoreViewState() {
        // Get state from RefreshManager instead of internal state
        const savedState = JSON.parse(localStorage.getItem('pageState'));
        if (!savedState || !savedState.viewState) {
            console.log("No valid view state to restore");
            return;
        }

        const viewState = savedState.viewState;
        
        const container = this.uiManager.createShowcaseContainer(viewState.textId);
        if (!container) {
            console.log("Failed to create showcase container");
            return;
        }

        if (viewState.viewType === 'tree') {
            window.skipInitialTreeTransform = true;
            await this.uiManager.drawTree(viewState.textId, container);
            
            if (viewState.zoomTransform) {
                const svg = d3.select('#showcase svg');
                if (!svg.empty() && window.treeVisualizerInstance?.zoom) {
                    const transform = viewState.zoomTransform;
                    const newTransform = d3.zoomIdentity
                        .translate(transform.x, transform.y)
                        .scale(transform.k);
                    svg.call(window.treeVisualizerInstance.zoom.transform, newTransform);
                }
            }
            window.skipInitialTreeTransform = false;
        } else if (viewState.viewType === 'shelf') {
            await this.uiManager.drawShelf(viewState.textId, container);
        }
    }

    restoreDrawers(drawers) {
        drawers.forEach(storyId => {
            const drawer = this.container.querySelector(`[data-story-id="${storyId}"] .writing`);
            if (drawer) {
                drawer.classList.add('visible');
                drawer.classList.remove('hidden');
                const arrow = drawer.closest('.node').querySelector(".arrow");
                if (arrow) arrow.textContent = '▼';
            }
        });
    }
}
