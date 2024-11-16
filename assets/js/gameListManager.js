import { DataManager } from './dataManager.js';
import { SVGManager } from './svgManager.js';
import { eventBus } from './eventBus.js';

export class GameListManager {
    constructor(container, path) {
        this.path = path;
        this.container = container;
        this.dataManager = DataManager.getInstance(path); 
        this.initialLoadComplete = false;
        
        // Get user ID from meta tag or data attribute
        const userDataElement = document.querySelector('meta[name="user"]');
        if (userDataElement) {
            const userId = userDataElement.dataset.userId;
            this.userLoggedIn = userDataElement.dataset.guest === 'false';
            this.dataManager.setCurrentUser(userId);
        }

        this.gamesData = this.loadGamesData();
        
        // Initialize with server data if available
        if (this.gamesData) {
            // Just update the cache without triggering UI updates
            this.dataManager.initializeGamesData(this.gamesData);
        }

        // Initialize lastGamesCheck if it's null
        if (this.dataManager.cache.lastGamesCheck === null) {
            this.dataManager.cache.lastGamesCheck = Date.now();
            this.dataManager.saveCache();
        }
        this.updateInterval = 30000; // Check for updates every 30 seconds
        this.startUpdateChecker();
        this.initialLoadComplete = true;

        // Add event listener for game updates
        eventBus.on('updateGame', (gameData) => {
            this.updateGameElement(gameData);
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

    async startUpdateChecker() {
        setInterval(async () => {
            const hasUpdates = await this.dataManager.checkForUpdates();
            if (hasUpdates) {
                // Instead of rendering everything, only update modified games
                const modifiedGames = this.dataManager.getRecentlyModifiedGames();
                modifiedGames.forEach(game => this.updateGameElement(game));
            }
        }, this.updateInterval);
    }

    renderGameCard(game) {
        // Ensure boolean conversion is consistent
        const isOpen = game.openForChanges === '1' || game.openForChanges === true;
        const hasContributed = game.hasContributed === '1' || game.hasContributed === true;
        
        return `
            <div class="story ${isOpen ? '' : 'closed'}" 
                 data-game-id="${game.id}" 
                 data-unseen-count="${game.unseen_count}" 
                 data-seen-count="${game.seen_count}" 
                 data-text-count="${game.text_count}" 
                 data-text-id="${game.text_id}">
                <div class="story-title ${game.unseen_count > 0 && this.userLoggedIn ? 'unreads' : ''}">
                    <h2 class="${hasContributed ? 'contributed' : ''}">
                        <a data-refresh-modal data-text-id="${game.text_id}">
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
                <button data-bookmark-story data-text-id="${game.text_id}" class="story-btn bookmark-btn" data-svg="bookmark">
                    ${SVGManager.bookmarkSVG}
                </button>
            ` : ''}
            <button data-refresh-tree data-text-id="${game.text_id}" class="story-btn" data-svg="tree">
                <img class="refresh-tree" src="${this.path}assets/imgs/icons/tree.svg" alt="view tree">
            </button>
            <button data-refresh-shelf data-text-id="${game.text_id}" class="story-btn" data-svg="shelf">
                <img class="refresh-shelf" src="${this.path}assets/imgs/icons/shelf.svg" alt="view shelf"> 
            </button>
        `;
    }

    renderGameStatus(game) {
        // Ensure consistent status determination
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

    renderCurrentPage() {
        const paginatedData = this.dataManager.getPaginatedData();
        console.log(`Rendering ${paginatedData.items.length} games`);
        
        paginatedData.items.forEach(game => {
            this.updateGame(game);
        });
    }

    updateGameElement(gameData) {
        // First, check if this game belongs to the current view
        const gameId = gameData.game_id || gameData.id;
        const gameElement = this.container.querySelector(`[data-game-id="${gameId}"]`);
        
        if (gameElement) {
            // Update existing game elements selectively
            this.updateExistingGame(gameElement, gameData);
        } else {
            // Only add new game if it's not already on the page
            const existingGame = this.container.querySelector(`[data-text-id="${gameData.id}"]`);
            if (!existingGame) {
                const newGameElement = this.renderGameCard(gameData);
                
                // Find the correct position to insert the new game
                const games = Array.from(this.container.children);
                const insertIndex = games.findIndex(game => 
                    parseInt(game.dataset.gameId) > gameId
                );
                
                if (insertIndex === -1) {
                    this.container.insertAdjacentHTML('beforeend', newGameElement);
                } else {
                    games[insertIndex].insertAdjacentHTML('beforebegin', newGameElement);
                }
            }
        }
    }

    updateExistingGame(gameElement, gameData) {
        // Ensure boolean conversion is consistent
        const isOpen = gameData.openForChanges === '1' || gameData.openForChanges === true;
        const hasContributed = gameData.hasContributed === '1' || gameData.hasContributed === true;

        // Update story class for open/closed status
        if (isOpen) {
            gameElement.classList.remove('closed');
        } else {
            gameElement.classList.add('closed');
        }

        // Update data attributes
        gameElement.dataset.unseenCount = gameData.unseen_count;
        gameElement.dataset.seenCount = gameData.seen_count;
        gameElement.dataset.textCount = gameData.text_count;

        // Update title and unreads status
        const titleDiv = gameElement.querySelector('.story-title');
        if (titleDiv) {
            if (this.userLoggedIn) {
                if (gameData.unseen_count > 0) {
                    titleDiv.classList.add('unreads');
                } else {
                    titleDiv.classList.remove('unreads');
                }
            }

            // Update title text and contributed status
            const h2 = titleDiv.querySelector('h2');
            if (h2) {
                if (hasContributed) {
                    h2.classList.add('contributed');
                } else {
                    h2.classList.remove('contributed');
                }
                const titleLink = h2.querySelector('a');
                if (titleLink) {
                    titleLink.textContent = gameData.title || 'Untitled';
                }
            }
        }

        // Update game status
        const statusIndicator = gameElement.querySelector('.game-status-indicator');
        if (statusIndicator) {
            statusIndicator.outerHTML = this.renderGameStatus(gameData);
        }

        // Update prompt if it exists
        const promptDiv = gameElement.querySelector('.story-prompt');
        if (promptDiv && gameData.prompt) {
            promptDiv.outerHTML = this.renderPrompt(gameData.prompt);
        } else if (!promptDiv && gameData.prompt) {
            // Add prompt if it didn't exist before
            const writingDiv = gameElement.querySelector('.story-writing');
            if (writingDiv) {
                writingDiv.insertAdjacentHTML('beforeend', this.renderPrompt(gameData.prompt));
            }
        }
    }

    // In your polling/update handling code:
    handleGameUpdates(updatedGames) {
        updatedGames.forEach(game => this.updateGameElement(game));
    }
}