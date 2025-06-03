import { eventBus } from './eventBus.js';
import { PageTypeManager } from './pageTypeManager.js';

/**
 * CurrentActivityManager
 * 
 * Manages user activity tracking and heartbeat system for the application.
 * 
 * Features:
 * - Dual idle detection system (timer-based + engagement-based)
 * - Activity-based heartbeat system with automatic idle detection
 * - Context-aware tracking (page type, game, text being viewed)
 * - Shelf node management for tracking open story nodes
 * - Engagement metrics tracking (mouse, keyboard, scroll, clicks)
 * 
 * Architecture:
 * - Phase 1: Page/Activity type detection
 * - Phase 2: Context ID extraction based on page type
 * - Phase 3: Event listener setup and tracking start
 */

export class CurrentActivityManager {
    constructor() {
        // Singleton pattern
        if (window.currentActivityManagerInstance) {
            return window.currentActivityManagerInstance;
        }

        // Core activity state
        this.currentActivity = {
            page_type: null,        // Type of page (game_list, text_form, etc.)
            activity_type: null,    // Type of activity (browsing, editing, etc.)
            game_id: null,          // Current game being viewed
            text_id: null,          // Current text being viewed/edited
            parent_id: null,        // Parent text ID (for form contexts)
            activity_level: 'active' // Current activity level (active/idle)
        };

        // Initialization control
        this.isInitializing = true;

        // Shelf node tracking (most recent first)
        this.openShelfNodes = [];

        // Heartbeat system configuration
        this.heartbeatInterval = 30000; // 30 seconds between heartbeats
        this.heartbeatTimer = null;
        this.hasActivitySinceLastHeartbeat = false; // Track user engagement between heartbeats
        this.isCurrentlyIdle = false; // Current idle state

        // Idle detection system (runs parallel to heartbeat system)
        // Use slightly shorter timeout to ensure idle detection fires before heartbeat timer
        this.idleTimeout = 29000; // 29 seconds (1s buffer before heartbeat timer)
        this.idleTimer = null;
        this.lastActivity = Date.now();

        // User engagement metrics for intelligent idle detection
        this.engagementMetrics = {
            mouseMovements: 0,
            keystrokes: 0,
            scrolls: 0,
            clicks: 0,
            lastReset: Date.now()
        };

        // Extract user ID from meta tag
        const userIdMeta = document.querySelector('meta[name="user"]');
        this.currentUserId = userIdMeta?.getAttribute('data-user-id') !== 'null' ? 
                           userIdMeta?.getAttribute('data-user-id') : null;

        // Only log if no user ID found (important for debugging)
        if (!this.currentUserId) {
            console.warn('CurrentActivityManager: No user ID found - activity tracking disabled');
        }
        
        window.currentActivityManagerInstance = this;
        this.init();
    }

    /**
     * Initialize the activity manager in three phases
     */
    init() {
        // Phase 1: Detect page and activity types (determines what context we need)
        this.detectPageAndActivityTypes();
        
        // Phase 2: Extract context IDs based on the detected page type
        this.extractContextIds();
        
        // Phase 3: Setup and start tracking
        this.isInitializing = false; // Allow heartbeats to be sent
        this.setupEventListeners();
        
        // Treat page loading as user activity (ensures first heartbeat is 'active')
        this.hasActivitySinceLastHeartbeat = true;
        this.lastActivity = Date.now();
        
        // Start activity tracking
        this.startTracking();
    }

    /**
     * Phase 1: Page and Activity Type Detection
     * Determines what kind of page we're on and what activity the user is performing.
     * This drives how we extract context IDs in Phase 2.
     */
    detectPageAndActivityTypes() {
        const pageType = PageTypeManager.getCurrentPageType();
        const activityType = PageTypeManager.getActivityTypeForPageType(pageType);

        this.setPageType(pageType, false); // Don't trigger heartbeat during init
        this.setActivityType(activityType, false); // Don't trigger heartbeat during init
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
                break;
        }
    }

    /**
     * Extract context for game list and collaboration pages
     * Looks for the current game element and any open story nodes
     */
    extractGamePageContext(rootStoryId = null) {
        const currentRootStoryId = rootStoryId || window.dataManager.getCurrentViewedRootStoryId();
        
        // Extract game_id from the game element
        this.extractGameId(currentRootStoryId);
        
        // Extract text_id from currently open shelf nodes or modal
        this.extractTextId(currentRootStoryId);
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
    }

    /**
     * Extract text_id from currently open modal or most recent shelf node
     * Modal takes priority over shelf nodes
     */
    extractTextId(rootStoryId = null) {
        // Check for open modal first (takes priority)
        const modalTextId = this.getTextIdFromModal();
        if (modalTextId) {
            this.currentActivity.text_id = modalTextId;
            return;
        }

        // If no modal is open, use the most recent shelf node from our array
        const lastShelfNode = this.getLastShelfNode();
        this.currentActivity.text_id = lastShelfNode;
    }

    /**
     * Set text_id with optional heartbeat triggering
     * Used for modal/shelf interactions and programmatic updates
     */
    setTextId(textId, triggerHeartbeat = true) {
        if (this.currentActivity.text_id !== textId) {
            this.currentActivity.text_id = textId;
            // Reset heartbeat timer on text context change
            if (triggerHeartbeat && !this.isInitializing) {
                this.sendHeartbeatAndResetTimer();
            }
        }
    }

    /**
     * Add text ID to the shelf nodes array (most recent first)
     * Removes duplicates to maintain clean array
     */
    addToShelfNodes(textId) {
        // Remove if already exists to avoid duplicates
        this.removeFromShelfNodes(textId);
        // Add to the beginning of the array (most recent first)
        this.openShelfNodes.unshift(textId);
    }

    /**
     * Remove text ID from the shelf nodes array
     */
    removeFromShelfNodes(textId) {
        const index = this.openShelfNodes.indexOf(textId);
        if (index > -1) {
            this.openShelfNodes.splice(index, 1);
        }
    }

    /**
     * Clear all shelf nodes (when changing games or showcase types)
     */
    clearShelfNodes() {
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
            return;
        }

        this.currentActivity.game_id = form.querySelector('input[name="game_id"]')?.value || null;
        this.currentActivity.text_id = form.querySelector('input[name="id"]')?.value || null;
        this.currentActivity.parent_id = form.querySelector('input[name="parent_id"]')?.value || null;
    }

    /**
     * Handle game context changes (when switching between games)
     * Updates game_id only, text_id is handled separately by shelf/modal systems
     */
    handleGameContextChange(rootStoryId) {
        this.extractGameId(rootStoryId);
    }

    /**
     * Setup all event listeners for activity tracking and inflection points
     */
    setupEventListeners() {
        // User activity tracking for engagement metrics
        document.addEventListener('mousemove', () => this.handleMouseMove(), { passive: true });
        document.addEventListener('keydown', () => this.handleKeydown(), { passive: true });
        document.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        document.addEventListener('click', () => this.handleClick(), { passive: true });
        
        // Page visibility changes (browser tab switching)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Modal interactions (text viewing inflection points)
        eventBus.on('modalOpened', (textId) => {
            // Use setters with triggerHeartbeat=false for all but the last change
            this.setTextId(textId, false);
            this.setActivityLevel('active', false);
            this.markUserActivity('modalOpened');
            // Send single heartbeat after all changes
            this.sendHeartbeatAndResetTimer();
        });

        eventBus.on('modalClosed', () => {
            // Re-extract text_id from any open shelf nodes
            this.setTextId(null, false);
            this.setActivityLevel('active', false);
            this.markUserActivity('modalClosed');
            // Send single heartbeat after all changes
            this.sendHeartbeatAndResetTimer();
        });

        // Shelf node interactions (text viewing inflection points)
        eventBus.on('shelfNodeOpened', (textId) => {
            this.addToShelfNodes(textId);
            // Use setters with triggerHeartbeat=false for all but the last change
            this.setTextId(textId, false);
            this.setActivityLevel('active', false);
            this.markUserActivity('shelfNodeOpened');
            // Send single heartbeat after all changes
            this.sendHeartbeatAndResetTimer();
        });

        eventBus.on('shelfNodeClosed', (textId) => {
            this.removeFromShelfNodes(textId);
            
            // If the closed node was the current text_id, update to the most recent open shelf node
            if (this.currentActivity.text_id === textId) {
                const lastShelfNode = this.getLastShelfNode();
                this.setTextId(lastShelfNode, false); // Will be null if no shelf nodes are open
            }
            this.setActivityLevel('active', false);
            this.markUserActivity('shelfNodeClosed');
            // Send single heartbeat after all changes
            this.sendHeartbeatAndResetTimer();
        });

        // Data manager changes (SSE parameter updates)
        eventBus.on('sseParametersChanged', (params) => {
            if (params.type === 'rootStoryId') {
                // When game context changes, update game_id and clear text_id and shelf nodes
                this.extractGameId(params.value);
                this.clearShelfNodes(); // Clear shelf nodes array when game changes
                // Use setters with triggerHeartbeat=false for all but the last change
                this.setTextId(null, false); // Clear text_id since we're viewing a new game
                this.setActivityLevel('active', false);
                this.markUserActivity('sseParametersChanged');
                // Send single heartbeat after all changes
                this.sendHeartbeatAndResetTimer();
            }
        });

        // Showcase type changes (clear shelf nodes when switching between tree/shelf/default)
        eventBus.on('showcaseTypeChanged', ({ type, rootStoryId }) => {
            this.clearShelfNodes(); // Clear shelf nodes array when showcase type changes
            // Use setters with triggerHeartbeat=false for all but the last change
            this.setActivityLevel('active', false);
            this.setTextId(null, false); // Clear text_id since we're changing view types
            this.markUserActivity('showcaseTypeChanged');
            // Send single heartbeat after all changes
            this.sendHeartbeatAndResetTimer();
        });

        // Page navigation inflection points
        window.addEventListener('beforeunload', () => {
            this.setActivityLevel('idle'); // Mark as idle before leaving - this will trigger a final heartbeat
            this.stopTracking();
        });
    }

    // Enhanced engagement tracking methods
    handleMouseMove() {
        this.engagementMetrics.mouseMovements++;
        this.markUserActivity();
    }

    handleKeydown() {
        this.engagementMetrics.keystrokes++;
        this.markUserActivity();
    }

    handleScroll() {
        this.engagementMetrics.scrolls++;
        this.markUserActivity();
    }

    handleClick() {
        this.engagementMetrics.clicks++;
        this.markUserActivity();
    }

    /**
     * Handle page visibility changes (tab switching)
     * Uses conservative approach - doesn't immediately mark as idle
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Don't immediately set to idle - let the normal idle detection handle it
            // This prevents aggressive idle marking when user briefly switches tabs
        } else {
            // Page became visible - mark as active
            this.markUserActivity();
        }
    }

    /**
     * Mark user activity - core method for activity detection
     * Sets engagement flags and handles idle state recovery
     */
    markUserActivity(eventName = null) {
        const wasIdle = this.isCurrentlyIdle;
        this.lastActivity = Date.now();
        
        // Set the activity flag for the next heartbeat
        this.hasActivitySinceLastHeartbeat = true;
        
        // If we were idle, send immediate heartbeat and restart timer
        if (this.isCurrentlyIdle) {
            this.isCurrentlyIdle = false;
            this.setActivityLevel('active', false); // Don't trigger heartbeat here
            
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
            
            // Only mark as idle if:
            // 1. Enough time has passed since last activity
            // 2. Low engagement score (less than 5 interactions)
            // 3. Page is not hidden (already handled by visibility change)
            if (timeSinceActivity >= this.idleTimeout && engagementScore < 5) {
                this.setActivityLevel('idle', false); // Don't trigger heartbeat here
                this.isCurrentlyIdle = true;
                
                // Send "going idle" heartbeat and stop timer
                this.sendHeartbeatAndStopTimer();
            }
            
            // Reset engagement metrics every 5 minutes
            if (timeSinceReset >= 300000) { // 5 minutes
                this.resetEngagementMetrics();
            }
        }, this.idleTimeout);
    }

    /**
     * Reset engagement metrics (called periodically)
     */
    resetEngagementMetrics() {
        this.engagementMetrics = {
            mouseMovements: 0,
            keystrokes: 0,
            scrolls: 0,
            clicks: 0,
            lastReset: Date.now()
        };
    }

    /**
     * Set activity type with optional heartbeat triggering
     */
    setActivityType(type, triggerHeartbeat = true) {
        if (this.currentActivity.activity_type !== type) {
            this.currentActivity.activity_type = type;
            // Reset heartbeat timer on activity change
            if (triggerHeartbeat && !this.isInitializing) {
                this.sendHeartbeatAndResetTimer();
            }
        }
    }

    /**
     * Set page type with optional heartbeat triggering
     */
    setPageType(type, triggerHeartbeat = true) {
        if (this.currentActivity.page_type !== type) {
            this.currentActivity.page_type = type;
            // Reset heartbeat timer on page type change
            if (triggerHeartbeat && !this.isInitializing) {
                this.sendHeartbeatAndResetTimer();
            }
        }
    }   

    /**
     * Set activity level with optional heartbeat triggering
     * Emits event for UI updates (activity indicator)
     */
    setActivityLevel(level, triggerHeartbeat = true) {
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

    /**
     * Start activity tracking system
     * Sends initial heartbeat and starts both timer systems
     */
    startTracking() {
        if (!this.currentUserId) {
            return; // Skip tracking if no user ID
        }

        // Send initial heartbeat and start timer
        this.sendHeartbeatAndResetTimer();

        // Start idle detection
        this.markUserActivity();
    }

    /**
     * Stop activity tracking system
     * Clears all timers
     */
    stopTracking() {
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
        if (!this.currentUserId) {
            return; // Skip if no user ID
        }

        // Send the heartbeat immediately
        this.executeHeartbeat();

        // Reset the timer
        this.resetHeartbeatTimer();
    }

    /**
     * Send heartbeat and stop the timer (for going idle)
     */
    sendHeartbeatAndStopTimer() {
        if (!this.currentUserId) {
            return; // Skip if no user ID
        }

        // Send the heartbeat immediately
        this.executeHeartbeat();

        // Stop the timer since we're going idle
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
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
            this.executeTimerBasedHeartbeat();
        }, this.heartbeatInterval);
    }

    /**
     * Execute heartbeat when timer expires
     * Determines activity level based on engagement and sends appropriate heartbeat
     */
    executeTimerBasedHeartbeat() {
        // Determine activity level based on whether we detected activity since last heartbeat
        // BUT: if we're currently marked as active and haven't been idle long enough, stay active
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        
        const activityLevel = (this.hasActivitySinceLastHeartbeat || timeSinceLastActivity < this.idleTimeout) ? 'active' : 'idle';

        // Update activity level if it changed
        if (this.currentActivity.activity_level !== activityLevel) {
            this.currentActivity.activity_level = activityLevel;
        }

        // If we're going idle, stop the timer after this heartbeat
        if (activityLevel === 'idle') {
            this.isCurrentlyIdle = true;
            this.executeHeartbeat();
            
            // Stop timer since we're now idle
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = null;
            }
        } else {
            // Send heartbeat and continue timer for next cycle
            this.executeHeartbeat();
        }

        // Reset the activity flag for the next cycle
        this.hasActivitySinceLastHeartbeat = false;
    }

    /**
     * Execute the actual heartbeat request
     * Sends current activity state to the server
     */
    async executeHeartbeat() {
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

        try {
            const endpoint = 'writerActivity/storeOrUpdate';
            const url = window.i18n.createUrl(endpoint);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('CurrentActivityManager: Heartbeat failed:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            // Emit event for activity indicator
            eventBus.emit('activityHeartbeat', {
                activity: this.currentActivity,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('CurrentActivityManager: Heartbeat error:', error);
        }
    }

    /**
     * Batch update multiple activity properties and send a single heartbeat
     * Useful for updating multiple properties without triggering multiple heartbeats
     * @param {Object} updates - Object with properties to update
     * @param {boolean} triggerHeartbeat - Whether to send heartbeat after updates
     * @returns {boolean} - Whether any changes were made
     */
    updateActivity(updates, triggerHeartbeat = true) {
        let hasChanges = false;
        
        // Apply updates using setters (without triggering individual heartbeats)
        if (updates.hasOwnProperty('activity_type') && updates.activity_type !== this.currentActivity.activity_type) {
            this.setActivityType(updates.activity_type, false);
            hasChanges = true;
        }
        
        if (updates.hasOwnProperty('page_type') && updates.page_type !== this.currentActivity.page_type) {
            this.setPageType(updates.page_type, false);
            hasChanges = true;
        }
        
        if (updates.hasOwnProperty('activity_level') && updates.activity_level !== this.currentActivity.activity_level) {
            this.setActivityLevel(updates.activity_level, false);
            hasChanges = true;
        }
        
        if (updates.hasOwnProperty('text_id') && updates.text_id !== this.currentActivity.text_id) {
            this.setTextId(updates.text_id, false);
            hasChanges = true;
        }
        
        // Handle direct property updates that don't have setters
        if (updates.hasOwnProperty('game_id') && updates.game_id !== this.currentActivity.game_id) {
            this.currentActivity.game_id = updates.game_id;
            hasChanges = true;
        }
        
        if (updates.hasOwnProperty('parent_id') && updates.parent_id !== this.currentActivity.parent_id) {
            this.currentActivity.parent_id = updates.parent_id;
            hasChanges = true;
        }
        
        // Send single heartbeat if there were changes and heartbeat is requested
        if (hasChanges && triggerHeartbeat && !this.isInitializing) {
            this.sendHeartbeatAndResetTimer();
        }
        
        return hasChanges;
    }

    /**
     * Get a copy of the current activity state
     * @returns {Object} Copy of current activity object
     */
    getCurrentActivity() {
        return { ...this.currentActivity };
    }
} 