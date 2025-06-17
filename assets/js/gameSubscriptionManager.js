import { eventBus } from './eventBus.js';
import { PageTypeManager } from './pageTypeManager.js';

/**
 * GameSubscriptionManager
 * 
 * Manages game subscription context for SSE and polling systems.
 * 
 * SIMPLIFIED LOGIC:
 * - Game list pages: subscribe to all games
 * - Collaboration pages: subscribe to single game  
 * - Text forms: NO subscriptions (simplified - no game updates, no text updates)
 * - Everything else: no subscriptions
 * 
 * FUTURE ENHANCEMENT NOTES:
 * If you want users to receive updates while on form pages, you can:
 * 1. Modify the 'text_form' case below to return 'single_game' or 'all_games'
 * 2. Review backend logic in public/sse/events.php setupRedisSubscriptions() method
 *    around lines 330-370 to adjust what channels get subscribed to
 */
export class GameSubscriptionManager {
    constructor() {
        // Current subscription state - only track TYPE, use existing rootStoryId for identification
        this.subscriptionType = 'all_games'; // 'all_games', 'single_game', 'none'
        
        // Initialize on construction
        this.updateSubscriptionContext();
        
        // Listen for context changes
        this.setupEventListeners();
        
        // Make available globally for debugging
        window.gameSubscriptionManager = this;
    }
    
    /**
     * Get current subscription parameters for SSE/polling
     */
    getSubscriptionParams() {
        return {
            gameSubscriptionType: this.subscriptionType
            // NOTE: We don't need gameSubscriptionId - we use the existing rootStoryId
        };
    }
    
    /**
     * Update subscription context based on current page state
     */
    updateSubscriptionContext() {
        const pageType = PageTypeManager.getCurrentPageType();
        
        console.log('GameSubscriptionManager: Page detection details', {
            pageType,
            hasDataStories: !!document.querySelector('[data-stories]'),
            hasDataOneStory: !!document.querySelector('[data-one-story]'),
            hasFormTypeRoot: !!document.querySelector('[data-form-type="root"]'),
            hasFormTypeIteration: !!document.querySelector('[data-form-type="iteration"]'),
            hasFormTypeAddingNote: !!document.querySelector('[data-form-type="addingNote"]'),
            hasHomeContainer: !!document.querySelector('.home-container'),
            currentUrl: window.location.href
        });
        
        // Determine subscription type based on page context
        switch (pageType) {
            case 'game_list':
                this.subscriptionType = 'all_games';
                break;
                
            case 'collab_page':
                this.subscriptionType = 'single_game';
                // The specific game is identified by the existing rootStoryId in SSE params
                break;
                
            case 'text_form':
                // TODO: If we want some game level updates while writing, we can change the logic here--the rootStoryId is still in the dataManager cache... and so it is still in the SSE params... so the logic to ensure that the text updates would not be received is all on the backend, in 
                // This means no game updates AND no text updates while writing
                this.subscriptionType = 'none';
                console.log('GameSubscriptionManager: text_form - no subscriptions (simplified)');
                break;
                
            default:
                this.subscriptionType = 'none';
        }
        
        console.log('GameSubscriptionManager: Updated context', {
            pageType,
            subscriptionType: this.subscriptionType
        });
    }
    
    /**
     * Setup event listeners for context changes
     */
    setupEventListeners() {
        // Listen for showcase changes (when user opens/closes game details)
        eventBus.on('showcaseChanged', () => {
            this.updateSubscriptionContext();
        });
        
        // Listen for SSE parameter changes (when rootStoryId changes)
        eventBus.on('sseParametersChanged', () => {
            this.updateSubscriptionContext();
        });
    }
    
    /**
     * Force update subscription context (for external calls)
     */
    refresh() {
        this.updateSubscriptionContext();
        return this.getSubscriptionParams();
    }
} 