import { DataManager } from './dataManager.js';

export class GameListManager {
    constructor(container, path) {
        this.path = path;
        this.container = container;
        this.dataManager = new DataManager(this.path);
        this.gamesData = this.loadGamesData();
        
        // Initialize with server data if available
        if (this.gamesData) {
            this.dataManager.updateGamesData(this.gamesData);
        }

        this.updateInterval = 30000; // Check for updates every 30 seconds
        this.startUpdateChecker();
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
                this.renderCurrentPage();
            }
        }, this.updateInterval);
    }

    renderGameCard(game) {
        // Map backend data structure to match the PHP template
        return `
            <div class="story ${game.open_for_changes ? '' : 'closed'}" 
                 data-game-id="${game.id}" 
                 data-unseen-count="${game.unseen_count}" 
                 data-seen-count="${game.seen_count}" 
                 data-text-count="${game.text_count}" 
                 data-text-id="${game.text_id}">
                <div class="story-title ${game.unseen_count > 0 ? 'unreads' : ''}">
                    <h2 class="${game.hasContributed ? 'contributed' : ''}">
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
        const sessionWriterId = document.querySelector('[data-writer-id]')?.dataset.writerId;
        return `
            ${sessionWriterId ? `
                <button data-bookmark-story data-text-id="${game.text_id}" class="story-btn bookmark-btn" data-svg="bookmark">
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
        let status = game.pending ? 'pending' : (game.open_for_changes ? 'open' : 'closed');
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
        const storiesHtml = paginatedData.items
            .map(game => this.renderGameCard(game))
            .join('');
        
        // For now, just log the rendered HTML to compare with server-rendered version
        console.log('Frontend rendered HTML:', storiesHtml);
        
        // Don't replace the server-rendered content yet
        // this.container.innerHTML = storiesHtml;
    }

    updateGame(gameData) {
        const gameElement = this.container.querySelector(`[data-game-id="${gameData.id}"]`);
        if (gameElement) {
            // Update existing game
            gameElement.outerHTML = this.renderGameCard(gameData);
        } else {
            // New game, add to container
            this.container.insertAdjacentHTML('beforeend', this.renderGameCard(gameData));
        }
        
        // Update the data in memory
        this.dataManager.updateGame(gameData);
    }

    // In your polling/update handling code:
    handleGameUpdates(updatedGames) {
        updatedGames.forEach(game => this.updateGame(game));
    }
}