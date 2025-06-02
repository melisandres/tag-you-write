import { eventBus } from './eventBus.js';
import { PageTypeManager } from './pageTypeManager.js';

/**
 * CurrentActivityManager - Simplified Version
 * 
 * SIMPLIFICATION NOTES:
 * - Consolidated 3 redundant game context methods into 1 unified resolver
 * - Fixed the gameId vs rootStoryId parameter confusion
 * - Eliminated duplicate fallback logic
 * - Made context resolution more predictable and debuggable
 * 
 * CONTEXT RESOLUTION STRATEGY:
 * 1. DOM lookup (most reliable) - looks for [data-text-id] elements
 * 2. dataManager.getGame() with proper gameId
 * 3. Manual cache search as fallback
 * 4. Partial resolution (text_id only) if all else fails
 */

export class CurrentActivityManager {
    constructor() {
        if (window.currentActivityManagerInstance) {
            return window.currentActivityManagerInstance;
        }
        this.currentActivity = {
            page_type: null,
            activity_type: null,
            game_id: null,
            text_id: null,
            parent_d: null
        };

        this.currentActivity.activity_level = 'active';

        // Initialization flag to prevent premature heartbeats
        this.isInitializing = true;

        // Array to track open shelf nodes (most recent first)
        this.openShelfNodes = [];

        this.heartbeatInterval = 30000; // 30 seconds
        this.idleTimeout = 30000;      // 30 seconds
        this.heartbeatTimer = null;
        this.idleTimer = null;
        this.lastActivity = Date.now();
        this.isIdle = false;

        // User engagement tracking
        this.engagementMetrics = {
            mouseMovements: 0,
            keystrokes: 0,
            scrolls: 0,
            clicks: 0,
            lastReset: Date.now()
        };

        // Get user ID from meta tag
        const userIdMeta = document.querySelector('meta[name="user"]');
        this.currentUserId = userIdMeta?.getAttribute('data-user-id') !== 'null' ? 
                           userIdMeta?.getAttribute('data-user-id') : null;

        console.log('🎯 CurrentActivityManager: Initializing with user ID:', this.currentUserId);
        
        window.currentActivityManagerInstance = this;
        this.init();
    }

    init() {
        console.log('🎯 CurrentActivityManager: Starting initialization');
        
        // Phase 1: Detect page and activity types (determines what context we need)
        this.detectPageAndActivityTypes();
        
        // Phase 2: Extract context IDs based on the detected page type
        this.extractContextIds();
        
        // Initialization complete - now we can send heartbeats
        this.isInitializing = false;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start activity tracking
        this.startTracking();
        
        console.log('🎯 CurrentActivityManager: Initialized with activity:', this.currentActivity);
    }

    /**
     * Phase 1: Page and Activity Type Detection
     * Determines what kind of page we're on and what activity the user is performing.
     * This drives how we extract context IDs in Phase 2.
     */
    detectPageAndActivityTypes() {
        const pageType = PageTypeManager.getCurrentPageType();
        const activityType = PageTypeManager.getActivityTypeForPageType(pageType);

        this.setPageType(pageType);
        this.setActivityType(activityType);

        console.log('🎯 CurrentActivityManager: Detected page type:', pageType, 'and activity type:', activityType);
    }

    /**
     * Phase 2: Context ID Extraction
     * Based on the page type, extracts the relevant game_id, text_id, and parent_id
     * from the DOM. Different page types have different extraction strategies.
     */
    extractContextIds(rootStoryId = null) {
        // Clear previous context
        this.currentActivity.game_id = null;
        this.currentActivity.text_id = null;
        this.currentActivity.parent_id = null;

        switch (this.currentActivity.page_type) {
            case 'game_list':
            case 'collab_page':
                this.extractGamePageContext(rootStoryId);
                break;
            case 'text_form':
                this.extractFormPageContext();
                break;
            case 'home':
            case 'other':
            default:
                // No context extraction needed for these page types
                console.log('🎯 CurrentActivityManager: No context extraction needed for page type:', this.currentActivity.page_type);
                break;
        }

        console.log('🎯 CurrentActivityManager: Extracted context - game_id:', this.currentActivity.game_id, 
                   'text_id:', this.currentActivity.text_id, 'parent_id:', this.currentActivity.parent_id);
    }

    /**
     * Extract context for game list and collaboration pages
     * Looks for the current game element and any open story nodes
     */
    extractGamePageContext(rootStoryId = null) {
        const currentRootStoryId = rootStoryId || window.dataManager.getCurrentViewedRootStoryId();
        console.log('🎯 CurrentActivityManager: extractGamePageContext called with rootStoryId:', rootStoryId, 'using:', currentRootStoryId);
        
        // Extract game_id from the game element
        this.extractGameId(currentRootStoryId);
        
        // Extract text_id from currently open shelf nodes or modal
        this.extractTextId(currentRootStoryId);

        console.log('🎯 CurrentActivityManager: Game page context - game_id:', this.currentActivity.game_id, 'text_id:', this.currentActivity.text_id);
    }

    /**
     * Extract game_id from the root story element
     */
    extractGameId(rootStoryId) {
        if (!rootStoryId) {
            this.currentActivity.game_id = null;
            return;
        }
        
        const gameEl = document.querySelector(`[data-text-id="${rootStoryId}"]`);
        this.currentActivity.game_id = gameEl?.getAttribute('data-game-id') || null;
        
        console.log('🎯 CurrentActivityManager: Extracted game_id:', this.currentActivity.game_id, 'from element:', gameEl);
    }

    /**
     * Extract text_id from currently open modal only
     * (Shelf nodes are now managed by the array-based system)
     */
    extractTextId(rootStoryId = null) {
        // Check for open modal first (takes priority)
        const modalTextId = this.getTextIdFromModal();
        if (modalTextId) {
            this.currentActivity.text_id = modalTextId;
            console.log('🎯 CurrentActivityManager: Using text_id from modal:', modalTextId);
            return;
        }

        // If no modal is open, use the most recent shelf node from our array
        const lastShelfNode = this.getLastShelfNode();
        this.currentActivity.text_id = lastShelfNode;
        console.log('🎯 CurrentActivityManager: Using text_id from shelf array:', lastShelfNode);
    }

    /**
     * Set text_id directly (for modal/shelf interactions)
     */
    setTextId(textId) {
        console.log('🎯 CurrentActivityManager: Setting text_id from', this.currentActivity.text_id, 'to', textId);
        
        if (this.currentActivity.text_id !== textId) {
            this.currentActivity.text_id = textId;
            if (!this.isInitializing) {
                this.sendHeartbeat();
            }
        }
    }

    /**
     * Add text ID to the shelf nodes array (most recent first)
     */
    addToShelfNodes(textId) {
        // Remove if already exists to avoid duplicates
        this.removeFromShelfNodes(textId);
        // Add to the beginning of the array (most recent first)
        this.openShelfNodes.unshift(textId);
        console.log('🎯 CurrentActivityManager: Added to shelf nodes:', textId, 'Array:', this.openShelfNodes);
    }

    /**
     * Remove text ID from the shelf nodes array
     */
    removeFromShelfNodes(textId) {
        const index = this.openShelfNodes.indexOf(textId);
        if (index > -1) {
            this.openShelfNodes.splice(index, 1);
            console.log('🎯 CurrentActivityManager: Removed from shelf nodes:', textId, 'Array:', this.openShelfNodes);
        }
    }

    /**
     * Clear all shelf nodes (when changing games or showcase types)
     */
    clearShelfNodes() {
        console.log('🎯 CurrentActivityManager: Clearing shelf nodes array');
        this.openShelfNodes = [];
    }

    /**
     * Get the most recent shelf node ID (last opened)
     */
    getLastShelfNode() {
        return this.openShelfNodes.length > 0 ? this.openShelfNodes[0] : null;
    }

    /**
     * Get text ID from an open modal
     * @returns {string|null} The modal's text ID, or null if no modal is open
     */
    getTextIdFromModal() {
        const modal = document.querySelector('[data-tree-modal="visible"]');
        if (!modal) return null;
        return modal.getAttribute('data-text-id') || null;
    }

    /**
     * Extract context for form pages (editing/creating text)
     * Reads values from hidden form inputs
     */
    extractFormPageContext() {
        const form = document.querySelector('[data-form-type]');
        if (!form) {
            console.log('🎯 CurrentActivityManager: No form found on text_form page');
            return;
        }

        this.currentActivity.game_id = form.querySelector('input[name="game_id"]')?.value || null;
        this.currentActivity.text_id = form.querySelector('input[name="id"]')?.value || null;
        this.currentActivity.parent_id = form.querySelector('input[name="parent_id"]')?.value || null;

        console.log('🎯 CurrentActivityManager: Form page context from form:', form);
    }

    // === SIMPLIFIED WRAPPER METHODS ===

    handleGameContextChange(rootStoryId) {
        // When game context changes, only update game_id (text_id handled separately)
        console.log('🎯 CurrentActivityManager: Game context changed, extracting game_id for rootStoryId:', rootStoryId);
        this.extractGameId(rootStoryId);
    }

    setupEventListeners() {
        console.log('🎯 CurrentActivityManager: Setting up event listeners');
        
        // Enhanced user activity tracking with engagement metrics
        document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
        document.addEventListener('keydown', this.handleKeydown.bind(this), { passive: true });
        document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        document.addEventListener('click', this.handleClick.bind(this), { passive: true });
        
        // Page visibility changes (browser tab switching)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // 3. Modal interactions (text viewing inflection points)
        eventBus.on('modalOpened', (textId) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Modal opened for text:', textId);
            this.setTextId(textId);
            this.sendHeartbeat();
            //this.setActivityType('browsing'); // viewing text content
        });

        eventBus.on('modalClosed', () => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Modal closed, returning to shelf browsing');
            // Re-extract text_id from any open shelf nodes
            this.setTextId(null);
            this.sendHeartbeat();
            //this.setActivityType('browsing');
        });

        // 3b. Shelf node interactions (text viewing inflection points)
        eventBus.on('shelfNodeOpened', (textId) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Shelf node opened for text:', textId);
            this.addToShelfNodes(textId);
            this.setTextId(textId);
            this.sendHeartbeat();
        });

        eventBus.on('shelfNodeClosed', (textId) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Shelf node closed for text:', textId);
            this.removeFromShelfNodes(textId);
            
            // If the closed node was the current text_id, update to the most recent open shelf node
            if (this.currentActivity.text_id === textId) {
                const lastShelfNode = this.getLastShelfNode();
                this.setTextId(lastShelfNode); // Will be null if no shelf nodes are open
            }
            this.sendHeartbeat();
        });


        // 4. Data manager changes (SSE parameter updates)
        eventBus.on('sseParametersChanged', (params) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - SSE parameters changed:', params);
            if (params.type === 'rootStoryId') {
                // When game context changes, update game_id and clear text_id and shelf nodes
                this.extractGameId(params.value);
                this.clearShelfNodes(); // Clear shelf nodes array when game changes
                this.setTextId(null); // Clear text_id since we're viewing a new game
                this.sendHeartbeat();
            }
        });

        // 5. Showcase type changes (clear shelf nodes when switching between tree/shelf/default)
        eventBus.on('showcaseTypeChanged', ({ type, rootStoryId }) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Showcase type changed to:', type, 'for game:', rootStoryId);
            this.clearShelfNodes(); // Clear shelf nodes array when showcase type changes
            this.setTextId(null); // Clear text_id since we're changing view types
        });

        // TODO: DO i need this, or is the initialization process enough? 
        // 6. Page navigation inflection points
        window.addEventListener('beforeunload', () => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Page unloading, stopping tracking');
            this.setActivityLevel('idle'); // Mark as idle before leaving
            this.stopTracking();
        });
    }

    // Enhanced engagement tracking methods
    handleMouseMove() {
        this.engagementMetrics.mouseMovements++;
        this.handleUserActivity();
    }

    handleKeydown() {
        this.engagementMetrics.keystrokes++;
        this.handleUserActivity();
    }

    handleScroll() {
        this.engagementMetrics.scrolls++;
        this.handleUserActivity();
    }

    handleClick() {
        this.engagementMetrics.clicks++;
        this.handleUserActivity();
    }

    handleVisibilityChange() {
        if (document.hidden) {
            console.log('🎯 CurrentActivityManager: INFLECTION - Page hidden, setting to idle');
            this.setActivityLevel('idle');
        } else {
            console.log('🎯 CurrentActivityManager: INFLECTION - Page visible, resuming activity');
            this.handleUserActivity();
        }
    }

    handleUserActivity() {
        const wasIdle = this.isIdle;
        this.lastActivity = Date.now();
        
        if (this.isIdle) {
            this.isIdle = false;
            this.setActivityLevel('active');
            console.log('🎯 CurrentActivityManager: User activity detected - resuming from idle');
        }

        // Reset idle timer with enhanced engagement checking
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        
        this.idleTimer = setTimeout(() => {
            // Check engagement metrics before marking as idle
            const timeSinceActivity = Date.now() - this.lastActivity;
            const timeSinceReset = Date.now() - this.engagementMetrics.lastReset;
            
            // Calculate engagement score
            const engagementScore = this.engagementMetrics.mouseMovements + 
                                  this.engagementMetrics.keystrokes + 
                                  this.engagementMetrics.scrolls + 
                                  this.engagementMetrics.clicks;
            
            console.log('🎯 CurrentActivityManager: Idle check - time since activity:', timeSinceActivity, 
                       'engagement score:', engagementScore, 'page visible:', !document.hidden);
            
            // Only mark as idle if:
            // 1. Enough time has passed since last activity
            // 2. Low engagement score (less than 5 interactions)
            // 3. Page is not hidden (already handled by visibility change)
            if (timeSinceActivity >= this.idleTimeout && engagementScore < 5 && !document.hidden) {
                console.log('🎯 CurrentActivityManager: Idle timeout reached - setting to idle');
                this.setActivityLevel('idle');
                this.isIdle = true;
            } else {
                console.log('🎯 CurrentActivityManager: User still engaged, not marking as idle');
            }
            
            // Reset engagement metrics every 5 minutes
            if (timeSinceReset >= 300000) { // 5 minutes
                this.resetEngagementMetrics();
            }
        }, this.idleTimeout);

        if (wasIdle) {
            console.log('🎯 CurrentActivityManager: Activity resumed after idle period');
        }
    }

    resetEngagementMetrics() {
        console.log('🎯 CurrentActivityManager: Resetting engagement metrics');
        this.engagementMetrics = {
            mouseMovements: 0,
            keystrokes: 0,
            scrolls: 0,
            clicks: 0,
            lastReset: Date.now()
        };
    }

    setActivityType(type) {
        console.log('🎯 CurrentActivityManager: Setting activity type from', this.currentActivity.activity_type, 'to', type);
        
        if (this.currentActivity.activity_type !== type) {
            this.currentActivity.activity_type = type;
            // Only send heartbeat if initialization is complete
            if (!this.isInitializing) {
                this.sendHeartbeat();
            }
        }
    }

    setPageType(type) {
        console.log('🎯 CurrentActivityManager: Setting page type from', this.currentActivity.page_type, 'to', type);
        
        if (this.currentActivity.page_type !== type) {
            this.currentActivity.page_type = type;
            // Only send heartbeat if initialization is complete
            if (!this.isInitializing) {
                this.sendHeartbeat();
            }
        }
    }   

    setActivityLevel(level) {
        console.log('🎯 CurrentActivityManager: Setting activity level from', this.currentActivity.activity_level, 'to', level);
        
        if (this.currentActivity.activity_level !== level) {
            this.currentActivity.activity_level = level;
            // Only send heartbeat if initialization is complete
            if (!this.isInitializing) {
                this.sendHeartbeat();
            }
        }
    }


    // TODO: ok... we only track if there's a userID... that makes sense... set up the regular heartbeat... so... wait... if we send a heartbeat at an inflexion change... OR after a certain amount of time has passed... do both systems have to be aware of each other, or do they run concurrently? 
    startTracking() {
        console.log('🎯 CurrentActivityManager: Starting tracking for user:', this.currentUserId);
        
        if (!this.currentUserId) {
            console.log('🎯 CurrentActivityManager: No user ID found, skipping activity tracking');
            return;
        }

        // Send initial heartbeat
        this.sendHeartbeat();
        
        // Set up regular heartbeat
        this.heartbeatTimer = setInterval(() => {
            console.log('🎯 CurrentActivityManager: Regular heartbeat interval triggered');
            this.sendHeartbeat();
        }, this.heartbeatInterval);

        // Start idle detection
        this.handleUserActivity();
        
        console.log('🎯 CurrentActivityManager: Tracking started with', this.heartbeatInterval + 'ms interval');
    }

    // TODO: ok... this is good I think... I see an idle time, and a heartbeattimer... something to study... 
    stopTracking() {
        console.log('🎯 CurrentActivityManager: Stopping tracking');
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    async sendHeartbeat() {
        if (!this.currentUserId) {
            console.log('🎯 CurrentActivityManager: Skipping heartbeat - no user ID');
            return;
        }

        // Prepare payload with writer_id
        const payload = {
            writer_id: this.currentUserId,
            activity_type: this.currentActivity.activity_type,
            activity_level: this.currentActivity.activity_level,
            page_type: this.currentActivity.page_type,
            game_id: this.currentActivity.game_id,
            text_id: this.currentActivity.text_id,
            parent_id: this.currentActivity.parent_id
        };

        console.log('🎯 CurrentActivityManager: Sending heartbeat with data:', payload);

        try {
            const endpoint = 'writerActivity/storeOrUpdate'; // Use the correct endpoint
            const url = window.i18n.createUrl(endpoint);
            
            console.log('🎯 CurrentActivityManager: Heartbeat URL:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('🎯 CurrentActivityManager: Heartbeat response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('🎯 CurrentActivityManager: Heartbeat failed:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('🎯 CurrentActivityManager: Heartbeat successful:', result);
            
            // Emit event for activity indicator
            eventBus.emit('activityHeartbeat', {
                activity: this.currentActivity,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('🎯 CurrentActivityManager: Heartbeat error:', error);
        }
    }

    // Helper methods for external use
    updateActivity(updates) {
        console.log('🎯 CurrentActivityManager: Updating activity with:', updates);
        Object.assign(this.currentActivity, updates);
        this.sendHeartbeat();
    }

    getCurrentActivity() {
        return { ...this.currentActivity };
    }

    //TODO: where do I call this? 
    startEditing(textId, parentId = null) {
        console.log('🎯 CurrentActivityManager: Starting editing for text:', textId);
       // this.setTextContext(textId, parentId);
        this.setActivityType('editing');
    }

    stopEditing() {
        console.log('🎯 CurrentActivityManager: Stopping editing - returning to browsing');
        this.setActivityType('browsing');
    }

    startGame() {
        console.log('🎯 CurrentActivityManager: Starting game creation');
        this.setActivityType('starting_game');
    }

    // === TESTING METHODS ===
    // Public method to manually trigger page type detection for testing
    redetectPageType() {
        console.log('🎯 CurrentActivityManager: Manually triggering page type detection...');
        this.detectPageAndActivityTypes();
        return this.getCurrentActivity();
    }

    // Debug method to check what DOM elements are present for page type detection
    debugPageElements() {
        console.log('🔍 DEBUG: Checking page elements for detection...');
        console.log('🔍 [data-stories]:', document.querySelector('[data-stories]'));
        console.log('🔍 [data-form-type]:', document.querySelector('[data-form-type]'));
        console.log('🔍 [data-one-story]:', document.querySelector('[data-one-story]'));
        console.log('🔍 .home-container:', document.querySelector('.home-container'));
        
        const formElement = document.querySelector('[data-form-type]');
        if (formElement) {
            console.log('🔍 Form type attribute:', formElement.getAttribute('data-form-type'));
        }
        
        console.log('🔍 Current activity:', this.getCurrentActivity());
        return this.getCurrentActivity();
    }
} 