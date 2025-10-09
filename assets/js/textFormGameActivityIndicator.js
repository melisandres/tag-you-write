import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

/**
 * Text Form Game Activity Indicator
 * 
 * Displays real-time game activity (browsing:writing) on text form pages
 * Positioned to overlap the prompt area in the bottom right corner
 */
export class TextFormGameActivityIndicator {
    constructor() {
        this.container = null;
        this.gameId = null;
        this.activityData = { browsing: 0, writing: 0, total: 0 };
        
        console.log('🎮📝 TextFormGameActivityIndicator: Initializing');
        this.init();
    }

    init() {
        // Only initialize on text form pages
        if (!this.isTextFormPage()) {
            console.log('🎮📝 TextFormGameActivityIndicator: Not a text form page, skipping initialization');
            return;
        }

        this.extractGameId();
        if (this.gameId) {
            this.createIndicator();
            this.setupEventListeners();
            console.log('🎮📝 TextFormGameActivityIndicator: Initialization complete for game:', this.gameId);
        } else {
            console.log('🎮📝 TextFormGameActivityIndicator: No game_id found, skipping initialization');
        }
    }

    isTextFormPage() {
        const formType = document.querySelector('[data-form-type]')?.dataset.formType;
        if (!formType || formType === 'root') {
            return false
        }
        return true;
    }

    extractGameId() {
        const form = document.querySelector('[data-form-type]');
        if (form) {
            const gameIdInput = form.querySelector('input[name="game_id"]');
            this.gameId = gameIdInput?.value || null;
            console.log('🎮📝 TextFormGameActivityIndicator: Extracted game_id:', this.gameId);
        }
    }

    createIndicator() {
        // Find the right .info-text-container:
        // - Iteration forms: target the prompt area (second .info-container)
        // - Note forms: target the only .info-text-container
        // - Root forms: no .info-text-container = no indicator
        
        let positionTarget = document.querySelector('.info.iterate .info-container:nth-child(2) .info-text-container');
        
        if (!positionTarget) {
            // Fallback: any .info-text-container (note forms)
            positionTarget = document.querySelector('.info-text-container');
        }
        
        if (!positionTarget) {
            console.log('🎮📝 TextFormGameActivityIndicator: No suitable .info-text-container found (probably a root form - skipping)');
            return;
        }

        console.log('🎮📝 TextFormGameActivityIndicator: Found target container, creating indicator');

        // Translte the title
        const translatedTitle = window.i18n.translate('activity.browsingVsEditing');

        // Create the indicator element with all attributes and content in one template
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = `
            <div class="text-form-game-activity-indicator no-activity" 
                 data-game-id="${this.gameId}"
                 data-i18n-title="activity.browsingVsEditing"
                 title="${translatedTitle}">
                <span class="icon">${SVGManager.userSVG}</span>
                <div class="activity-numbers">0:0</div>
            </div>
        `;
        this.container = tempContainer.firstElementChild;

        // Append to the target container (CSS handles positioning)
        positionTarget.appendChild(this.container);

        console.log('🎮📝 TextFormGameActivityIndicator: Created indicator in DOM');
    }

    setupEventListeners() {
        if (!this.container) return;

        // Listen for game activity updates
        eventBus.on('gameActivityChanged', (data) => {
            if (data.gameId === this.gameId) {
                console.log('🎮📝 TextFormGameActivityIndicator: Received activity update for game', this.gameId, ':', data);
                this.updateDisplay(data);
            }
        });
    }

    updateDisplay(data) {
        if (!this.container) return;

        const browsing = data.browsing || 0;
        const writing = data.writing || 0;
        const total = browsing + writing;

        // Store the data
        this.activityData = { browsing, writing, total };

        // Update activity numbers
        const activityNumbers = this.container.querySelector('.activity-numbers');
        if (activityNumbers) {
            activityNumbers.textContent = `${browsing}:${writing}`;
        }

        // Update appearance based on activity
        // There will always be at least one activity: counting the user. 
        this.container.classList.toggle('has-activity', total > 0);
        this.container.classList.toggle('no-activity', total === 0);

        console.log('🎮📝 TextFormGameActivityIndicator: Updated display - Browsing:', browsing, 'Writing:', writing);
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        console.log('🎮📝 TextFormGameActivityIndicator: Destroyed');
    }
} 