import { eventBus } from './eventBus.js';
import { PageTypeManager } from './pageTypeManager.js';

/**
 * CurrentActivityManager 

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
            parent_d: null,
            activity_level: 'active'
        };

        // Initialization flag to prevent premature heartbeats
        this.isInitializing = true;

        // Array to track open shelf nodes (most recent first)
        this.openShelfNodes = [];

        // ACTIVITY-BASED HEARTBEAT SYSTEM
        this.heartbeatInterval = 30000; // 30 seconds
        this.heartbeatTimer = null;
        this.hasActivitySinceLastHeartbeat = false; // Simple boolean to track user engagement
        this.isCurrentlyIdle = false; // Track if we're in idle state
        
        // Idle detection (separate from heartbeat system)
        this.idleTimeout = 30000;      // 30 seconds to detect idle
        this.idleTimer = null;
        this.lastActivity = Date.now();

        // User engagement tracking (simplified)
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
        console.log('🔍 TRACE: Initial activity_level:', this.currentActivity.activity_level);
        
        // Phase 1: Detect page and activity types (determines what context we need)
        this.detectPageAndActivityTypes();
        
        // Phase 2: Extract context IDs based on the detected page type
        this.extractContextIds();
        
        // Initialization complete - now we can send heartbeats
        this.isInitializing = false;
        console.log('🔍 TRACE: After initialization, isInitializing:', this.isInitializing);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // IMPORTANT: Treat page loading as user activity
        // This ensures the first heartbeat will be marked as 'active'
        this.hasActivitySinceLastHeartbeat = true;
        this.lastActivity = Date.now();
        console.log('🔍 TRACE: Set hasActivitySinceLastHeartbeat to true, activity_level:', this.currentActivity.activity_level);
        
        // Start activity tracking
        this.startTracking();
        
        console.log('🎯 CurrentActivityManager: Initialized with activity:', this.currentActivity);
        console.log('🔍 TRACE: Final activity_level after init:', this.currentActivity.activity_level);
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
            // Reset heartbeat timer on text context change
            if (!this.isInitializing) {
                this.sendHeartbeatAndResetTimer();
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
        document.addEventListener('mousemove', () => this.handleMouseMove('mousemove'), { passive: true });
        document.addEventListener('keydown', () => this.handleKeydown('keydown'), { passive: true });
        document.addEventListener('scroll', () => this.handleScroll('scroll'), { passive: true });
        document.addEventListener('click', () => this.handleClick('click'), { passive: true });
        
        // Page visibility changes (browser tab switching)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // 3. Modal interactions (text viewing inflection points)
        eventBus.on('modalOpened', (textId) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Modal opened for text:', textId);
            this.currentActivity.text_id = textId;
            this.currentActivity.activity_level = 'active';
            this.markUserActivity('modalOpened'); // Ensure activity flags are set
            this.sendHeartbeatAndResetTimer();
            //this.setActivityType('browsing'); // viewing text content
        });

        eventBus.on('modalClosed', () => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Modal closed, returning to shelf browsing');
            // Re-extract text_id from any open shelf nodes
            this.currentActivity.text_id = null;
            this.currentActivity.activity_level = 'active';
            this.markUserActivity('modalClosed'); // Ensure activity flags are set
            this.sendHeartbeatAndResetTimer();
            //this.setActivityType('browsing');
        });

        // 3b. Shelf node interactions (text viewing inflection points)
        eventBus.on('shelfNodeOpened', (textId) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Shelf node opened for text:', textId);
            this.addToShelfNodes(textId);
            this.currentActivity.text_id = textId;
            this.currentActivity.activity_level = 'active';
            this.markUserActivity('shelfNodeOpened'); // Ensure activity flags are set
            this.sendHeartbeatAndResetTimer ();
        });

        eventBus.on('shelfNodeClosed', (textId) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Shelf node closed for text:', textId);
            this.removeFromShelfNodes(textId);
            
            // If the closed node was the current text_id, update to the most recent open shelf node
            if (this.currentActivity.text_id === textId) {
                const lastShelfNode = this.getLastShelfNode();
                this.currentActivity.text_id = lastShelfNode; // Will be null if no shelf nodes are open
            }
            this.currentActivity.activity_level = 'active';
            this.markUserActivity('shelfNodeClosed'); // Ensure activity flags are set
            this.sendHeartbeatAndResetTimer();
        });


        // 4. Data manager changes (SSE parameter updates)
        eventBus.on('sseParametersChanged', (params) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - SSE parameters changed:', params);
            if (params.type === 'rootStoryId') {
                // When game context changes, update game_id and clear text_id and shelf nodes
                this.extractGameId(params.value);
                this.clearShelfNodes(); // Clear shelf nodes array when game changes
                this.currentActivity.text_id = null; // Clear text_id since we're viewing a new game
                this.currentActivity.activity_level = 'active';
                this.markUserActivity('sseParametersChanged'); // Ensure activity flags are set
                this.sendHeartbeatAndResetTimer();
            }
        });

        // 5. Showcase type changes (clear shelf nodes when switching between tree/shelf/default)
        eventBus.on('showcaseTypeChanged', ({ type, rootStoryId }) => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Showcase type changed to:', type, 'for game:', rootStoryId);
            this.clearShelfNodes(); // Clear shelf nodes array when showcase type changes
            this.currentActivity.activity_level = 'active';
            this.currentActivity.text_id = null; // Clear text_id since we're changing view types
            this.markUserActivity('showcaseTypeChanged'); // Ensure activity flags are set
            this.sendHeartbeatAndResetTimer();
        });

        // TODO: DO i need this, or is the initialization process enough? 
        // 6. Page navigation inflection points
        window.addEventListener('beforeunload', () => {
            console.log('🎯 CurrentActivityManager: INFLECTION - Page unloading, stopping tracking');
            this.setActivityLevel('idle'); // Mark as idle before leaving?
            this.stopTracking();
        });
    }

    // Enhanced engagement tracking methods
    handleMouseMove(eventName = 'mousemove') {
        this.engagementMetrics.mouseMovements++;
        this.markUserActivity(eventName);
    }

    handleKeydown(eventName = 'keydown') {
        this.engagementMetrics.keystrokes++;
        this.markUserActivity(eventName);
    }

    handleScroll(eventName = 'scroll') {
        this.engagementMetrics.scrolls++;
        this.markUserActivity(eventName);
    }

    handleClick(eventName = 'click') {
        this.engagementMetrics.clicks++;
        this.markUserActivity(eventName);
    }

    handleVisibilityChange() {
        console.log('🔍 TRACE: handleVisibilityChange called');
        console.log('🔍 TRACE: document.hidden:', document.hidden);
        console.log('🔍 TRACE: document.visibilityState:', document.visibilityState);
        
        if (document.hidden) {
            console.log('🎯 CurrentActivityManager: INFLECTION - Page hidden, but NOT immediately setting to idle');
            console.log('🔍 TRACE: Page hidden - letting normal idle timer handle it');
            // Don't immediately set to idle - let the normal idle detection handle it
            // this.setActivityLevel('idle'); // ← REMOVED: This was too aggressive
        } else {
            console.log('🎯 CurrentActivityManager: INFLECTION - Page visible, resuming activity');
            console.log('🔍 TRACE: About to call markUserActivity from visibility change');
            this.markUserActivity(); // This will set back to active if we were idle
        }
    }

    /**
     * Mark user activity - sets the engagement flag and handles idle state recovery
     */
    markUserActivity(eventName = null) {
        console.log('🔍 TRACE: markUserActivity called' + (eventName ? ' by ' + eventName : ''));
        console.log('🔍 TRACE: hasActivitySinceLastHeartbeat BEFORE:', this.hasActivitySinceLastHeartbeat);
        const wasIdle = this.isCurrentlyIdle;
        this.lastActivity = Date.now();
        
        // Only log when the activity flag changes from false to true (reduces console flooding)
        const wasActivityFlagSet = this.hasActivitySinceLastHeartbeat;
        
        // Set the activity flag for the next heartbeat
        this.hasActivitySinceLastHeartbeat = true;
        console.log('🔍 TRACE: hasActivitySinceLastHeartbeat AFTER:', this.hasActivitySinceLastHeartbeat);
        
        // Only log when the flag actually changes
        if (!wasActivityFlagSet) {
            console.log('🎯 CurrentActivityManager: Activity flag set to true');
        }
        
        // If we were idle, send immediate heartbeat and restart timer
        if (this.isCurrentlyIdle) {
            this.isCurrentlyIdle = false;
            this.setActivityLevel('active', false); // Don't trigger heartbeat here
            console.log('🎯 CurrentActivityManager: User activity detected - resuming from idle');
            
            // Send immediate "back to active" heartbeat and restart timer
            this.sendHeartbeatAndResetTimer();
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
            if (timeSinceActivity >= this.idleTimeout && engagementScore < 5) {
                console.log('🎯 CurrentActivityManager: Idle timeout reached - setting to idle');
                this.setActivityLevel('idle', false); // Don't trigger heartbeat here
                this.isCurrentlyIdle = true;
                
                // Send "going idle" heartbeat and stop timer
                this.sendHeartbeatAndStopTimer();
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
            // Reset heartbeat timer on activity change
            if (!this.isInitializing) {
                this.sendHeartbeatAndResetTimer();
            }
        }
    }

    setPageType(type) {
        console.log('🎯 CurrentActivityManager: Setting page type from', this.currentActivity.page_type, 'to', type);
        
        if (this.currentActivity.page_type !== type) {
            this.currentActivity.page_type = type;
            // Reset heartbeat timer on page type change
            if (!this.isInitializing) {
                this.sendHeartbeatAndResetTimer();
            }
        }
    }   

    setActivityLevel(level, triggerHeartbeat = true) {
        console.log('🔍 TRACE: setActivityLevel called with level:', level);
        console.log('🔍 TRACE: setActivityLevel - current level:', this.currentActivity.activity_level);
        console.log('🔍 TRACE: setActivityLevel - triggerHeartbeat:', triggerHeartbeat);
        console.log('🔍 TRACE: setActivityLevel - call stack:', new Error().stack);
        
        console.log('🎯 CurrentActivityManager: Setting activity level from', this.currentActivity.activity_level, 'to', level);
        
        if (this.currentActivity.activity_level !== level) {
            this.currentActivity.activity_level = level;
            
            // Emit event for UI updates
            eventBus.emit('activityLevelChanged', {
                level: level,
                timestamp: Date.now()
            });
            
            // Only trigger heartbeat if explicitly requested (prevents double heartbeats)
            if (triggerHeartbeat && !this.isInitializing) {
                this.sendHeartbeatAndResetTimer();
            }
        }
    }


    // TODO: ok... we only track if there's a userID... that makes sense... set up the regular heartbeat... so... wait... if we send a heartbeat at an inflexion change... OR after a certain amount of time has passed... do both systems have to be aware of each other, or do they run concurrently? 
    startTracking() {
        console.log('🎯 CurrentActivityManager: Starting tracking for user:', this.currentUserId);
        console.log('🔍 TRACE: startTracking - activity_level before first heartbeat:', this.currentActivity.activity_level);
        console.log('🔍 TRACE: startTracking - hasActivitySinceLastHeartbeat:', this.hasActivitySinceLastHeartbeat);
        
        if (!this.currentUserId) {
            console.log('🎯 CurrentActivityManager: No user ID found, skipping activity tracking');
            return;
        }

        // Send initial heartbeat and start timer
        console.log('🔍 TRACE: About to send initial heartbeat...');
        this.sendHeartbeatAndResetTimer();

        // Start idle detection
        this.markUserActivity();
        
        console.log('🎯 CurrentActivityManager: Tracking started with', this.heartbeatInterval + 'ms interval');
        console.log('🔍 TRACE: startTracking - activity_level after setup:', this.currentActivity.activity_level);
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

    /**
     * Send heartbeat and reset the timer - core method for activity-based system
     */
    sendHeartbeatAndResetTimer() {
        console.log('🔍 TRACE: sendHeartbeatAndResetTimer called');
        console.log('🔍 TRACE: Current activity_level:', this.currentActivity.activity_level);
        console.log('🔍 TRACE: hasActivitySinceLastHeartbeat:', this.hasActivitySinceLastHeartbeat);
        
        if (!this.currentUserId) {
            console.log('🎯 CurrentActivityManager: Skipping heartbeat - no user ID');
            return;
        }

        // Send the heartbeat immediately
        console.log('🔍 TRACE: About to execute heartbeat...');
        this.executeHeartbeat();

        // Reset the timer
        console.log('🔍 TRACE: About to reset heartbeat timer...');
        this.resetHeartbeatTimer();
    }

    /**
     * Send heartbeat and stop the timer (for going idle)
     */
    sendHeartbeatAndStopTimer() {
        if (!this.currentUserId) {
            console.log('🎯 CurrentActivityManager: Skipping heartbeat - no user ID');
            return;
        }

        // Send the heartbeat immediately
        this.executeHeartbeat();

        // Stop the timer since we're going idle
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
            console.log('🎯 CurrentActivityManager: Stopped heartbeat timer (going idle)');
        }
    }

    /**
     * Reset the heartbeat timer
     */
    resetHeartbeatTimer() {
        // Clear existing timer
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        // Start new timer
        this.heartbeatTimer = setInterval(() => {
            console.log('🎯 CurrentActivityManager: Timer-based heartbeat triggered');
            this.executeTimerBasedHeartbeat();
        }, this.heartbeatInterval);

        console.log('🎯 CurrentActivityManager: Heartbeat timer reset');
    }

    /**
     * Execute heartbeat when timer expires - determines activity level based on engagement
     */
    executeTimerBasedHeartbeat() {
        console.log('🔍 TRACE: executeTimerBasedHeartbeat called');
        console.log('🔍 TRACE: Current activity_level before logic:', this.currentActivity.activity_level);
        console.log('🔍 TRACE: hasActivitySinceLastHeartbeat:', this.hasActivitySinceLastHeartbeat);
        console.log('🔍 TRACE: lastActivity timestamp:', this.lastActivity);
        console.log('🔍 TRACE: isCurrentlyIdle:', this.isCurrentlyIdle);
        console.log('🔍 TRACE: document.hidden:', document.hidden);
        
        // Determine activity level based on whether we detected activity since last heartbeat
        // BUT: if we're currently marked as active and haven't been idle long enough, stay active
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        console.log('🔍 TRACE: timeSinceLastActivity:', timeSinceLastActivity, 'ms');
        console.log('🔍 TRACE: idleTimeout:', this.idleTimeout, 'ms');
        
        const activityLevel = (this.hasActivitySinceLastHeartbeat || timeSinceLastActivity < this.idleTimeout) ? 'active' : 'idle';
        
        console.log('🎯 CurrentActivityManager: Timer heartbeat - activity since last:', 
                   this.hasActivitySinceLastHeartbeat, 'time since activity:', timeSinceLastActivity, 
                   'should be idle:', activityLevel === 'idle', 'final level:', activityLevel);
        console.log('🔍 TRACE: Calculated activityLevel:', activityLevel);

        // Update activity level if it changed
        if (this.currentActivity.activity_level !== activityLevel) {
            console.log('🔍 TRACE: Activity level changing from', this.currentActivity.activity_level, 'to', activityLevel);
            this.currentActivity.activity_level = activityLevel;
        } else {
            console.log('🔍 TRACE: Activity level staying the same:', activityLevel);
        }

        // If we're going idle, stop the timer after this heartbeat
        if (activityLevel === 'idle') {
            console.log('🔍 TRACE: Going idle - will stop timer after heartbeat');
            this.isCurrentlyIdle = true;
            this.executeHeartbeat();
            
            // Stop timer since we're now idle
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = null;
                console.log('🎯 CurrentActivityManager: Stopped heartbeat timer (detected idle)');
            }
        } else {
            console.log('🔍 TRACE: Staying active - sending heartbeat and continuing timer');
            // Send heartbeat and reset timer for next cycle
            this.executeHeartbeat();
        }

        // Reset the activity flag for the next cycle
        console.log('🔍 TRACE: Resetting hasActivitySinceLastHeartbeat to false');
        this.hasActivitySinceLastHeartbeat = false;
    }

    /**
     * Actually execute the heartbeat request
     */
    async executeHeartbeat() {
        console.log('🔍 TRACE: executeHeartbeat called');
        console.log('🔍 TRACE: Current activity_level before payload creation:', this.currentActivity.activity_level);
        
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

        console.log('🎯 CurrentActivityManager: Executing heartbeat with data:', payload);
        console.log('🔍 TRACE: Payload activity_level is:', payload.activity_level);

        try {
            const endpoint = 'writerActivity/storeOrUpdate';
            const url = window.i18n.createUrl(endpoint);
            
            console.log('🔍 TRACE: Sending to URL:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('🎯 CurrentActivityManager: Heartbeat response status:', response.status);
            console.log('🔍 TRACE: Response details:', {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('🎯 CurrentActivityManager: Heartbeat failed:', response.status, errorText);
                console.error('🔍 TRACE: Error response body:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('🎯 CurrentActivityManager: Heartbeat successful:', result);
            console.log('🔍 TRACE: Success response details:', result);
            
            // Emit event for activity indicator
            eventBus.emit('activityHeartbeat', {
                activity: this.currentActivity,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('🎯 CurrentActivityManager: Heartbeat error:', error);
            console.error('🔍 TRACE: Full error object:', error);
        }
    }

    // Helper methods for external use
/*     updateActivity(updates) {
        console.log('🎯 CurrentActivityManager: Updating activity with:', updates);
        Object.assign(this.currentActivity, updates);
        this.sendHeartbeatAndResetTimer();
    } */

    getCurrentActivity() {
        return { ...this.currentActivity };
    }

/*     //TODO: where do I call this? 
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
    } */

    // === TESTING METHODS ===
    // Public method to manually trigger page type detection for testing
/*     redetectPageType() {
        console.log('🎯 CurrentActivityManager: Manually triggering page type detection...');
        this.detectPageAndActivityTypes();
        return this.getCurrentActivity();
    } */

    // Debug method to check what DOM elements are present for page type detection
/*     debugPageElements() {
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
    } */
} 