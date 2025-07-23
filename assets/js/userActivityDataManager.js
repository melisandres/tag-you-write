import { eventBus } from './eventBus.js';

/**
 * User Activity Data Manager
 * 
 * Manages user-centric activity tracking to solve the "missing game close" problem.
 * Tracks individual user activities and derives aggregated game activities.
 * 
 * Key Features:
 * - User-centric tracking (explicit state changes)
 * - Automatic cleanup when users change activities
 * - Derives game activities from user data
 * - Handles user disconnections and idle states
 */
export class UserActivityDataManager {
    constructor() {
        console.log('👤 UserActivityDataManager: Initializing');
        
        // Singleton pattern - return existing instance if it exists
        if (window.userActivityDataManager) {
            return window.userActivityDataManager;
        }
        
        // Configuration constants
        this.CONFIG = {
            CLEANUP_INTERVAL: 120000,      // 2 minutes
            STALE_THRESHOLD: 600000,       // 10 minutes  
            WRITING_TYPES: ['iterating', 'adding_note', 'starting_game'],
            TEXT_EDITING_TYPES: ['iterating', 'adding_note'], // Text-level editing activities
            ID_FIELDS: ['writer_id', 'user_id', 'game_id', 'text_id', 'parent_id'],
            DEBUG: true  // Set to true to enable debug logging
        };
        
        // State management for user activities
        this.userData = {
            // Map of writer_id -> user activity object
            users: new Map(),
            lastUpdated: null
        };
        
        // Derived game activities (computed from user data)
        this.derivedGameActivities = {
            data: [], // Array of game activity objects derived from user data
            lastUpdated: null
        };
        
        // Derived text activities (computed from user data)
        this.derivedTextActivities = {
            data: [], // Array of text activity objects derived from user data
            lastUpdated: null
        };
        
        // Derived site-wide activities (computed from user data)
        this.derivedSiteActivity = {
            browsing: 0,
            writing: 0,
            total: 0,
            lastUpdated: null
        };
        
        // Store singleton instance (cleaned up - using consistent naming)
        window.userActivityDataManager = this;
        
        // Add global diagnostic function for debugging
        window.debugUserActivity = () => {
            console.log('=== USER ACTIVITY DIAGNOSTIC ===');
            console.log(this.getDiagnosticInfo());
            return this.getDiagnosticInfo();
        };

        
        // Initialize
        this.init();
    }
    
    /**
     * Static method to get the singleton instance
     * Provides cleaner access pattern for future use
     */
    static getInstance() {
        if (!window.userActivityDataManager) {
            window.userActivityDataManager = new UserActivityDataManager();
        }
        return window.userActivityDataManager;
    }
    
    /**
     * Static method to reset instance (useful for testing)
     */
    static resetInstance() {
        if (window.userActivityDataManager) {
            // Clean up timers and event listeners
            if (window.userActivityDataManager.cleanupTimer) {
                clearInterval(window.userActivityDataManager.cleanupTimer);
            }
            delete window.userActivityDataManager;
            delete window.UserActivityDataManager;
        }
    }
    
    init() {
        console.log('👤 UserActivityDataManager: Setting up event listeners');
        this.setupEventListeners();
        
        // Initialize with current active users from database
        this.initializeFromDatabase();
        
        // Start cleanup timer for stale user activities
        this.startCleanupTimer();
    }
    
    setupEventListeners() {
        // Listen for individual user activity updates from SSE (remote users)
        eventBus.on('userActivityUpdate', this.handleUserActivityUpdate.bind(this));
        
        // Listen for local user's own heartbeats (immediate local updates)
        eventBus.on('activityHeartbeat', this.handleLocalUserHeartbeat.bind(this));
        
        console.log('👤 UserActivityDataManager: Event listeners established');
    }
    
    /**
     * Initialize with current active users from database
     */
    async initializeFromDatabase() {
        try {
            console.log('👤 UserActivityDataManager: Initializing from database...');
            const endpoint = 'WriterActivity/getAllActiveUsers';
            const url = window.i18n.createUrl(endpoint);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const activeUsers = await response.json();
            console.log('👤 UserActivityDataManager: Received', activeUsers.length, 'active users from database');
            
            // Process each user (this will trigger the array handling in handleUserActivityUpdate)
            if (activeUsers.length > 0) {
                this.handleUserActivityUpdate(activeUsers);
            }
            
        } catch (error) {
            console.error('👤 UserActivityDataManager: Failed to initialize from database:', error);
        }
    }
    
    /**
     * Handle individual user activity updates from SSE (remote users) or arrays from initialization
     * This is the core of user-centric tracking
     */
    handleUserActivityUpdate(userActivityData) {
        // Handle arrays (from initialization) - batch process to avoid multiple emissions
        if (Array.isArray(userActivityData)) {
            this.processBatchUserActivities(userActivityData, 'initialization');
            return;
        }
        
        // Handle single user activity (from SSE)
        const normalized = this.normalizeUserActivityData(userActivityData, 'sse');
        if (normalized) {
            this.processUserActivity(normalized, 'remote');
        } else {
            console.error('UserActivityDataManager: Failed to normalize user activity data');
        }
    }

    /**
     * Handle local user's own heartbeats (immediate local updates)
     */
    handleLocalUserHeartbeat(heartbeatEvent) {
        const normalized = this.normalizeUserActivityData(heartbeatEvent, 'heartbeat');
        if (normalized) {
            this.processUserActivity(normalized, 'local');
        }
    }

    /**
     * Process multiple user activities in batch (for initialization)
     * This prevents multiple site activity emissions during startup
     */
    processBatchUserActivities(userActivityDataArray, source) {
        const allChanges = [];
        
        // Process all users without triggering events
        userActivityDataArray.forEach(userData => {
            const normalized = this.normalizeUserActivityData(userData, 'sse');
            if (normalized) {
                const writerId = String(normalized.writer_id);
                const previousUserActivity = this.userData.users.get(writerId);
                
                // Store user activity with timestamp
                const userActivity = {
                    ...normalized,
                    lastSeen: Date.now(),
                    source: source
                };
                
                this.userData.users.set(writerId, userActivity);
                
                // Detect changes but don't emit events yet
                const changes = this.detectUserChanges(previousUserActivity, userActivity);
                allChanges.push(...changes);
            }
        });
        
        // Update timestamp once
        this.userData.lastUpdated = Date.now();
        
        // Process all changes at once
        if (allChanges.length > 0) {
            // Recompute affected activities (games, texts, site-wide)
            this.recomputeAffectedActivities(allChanges);
            
            // Emit events for all changes
            this.emitActivityEvents(allChanges);
        }
    }

    /**
     * Process user activity (common logic for both local and remote updates)
     */
    processUserActivity(userActivityData, source) {
        // Ensure consistent string-based user IDs to avoid number/string key conflicts
        const writerId = String(userActivityData.writer_id);
        const previousUserActivity = this.userData.users.get(writerId);
        
        // Store user activity with timestamp
        const userActivity = {
            ...userActivityData,
            lastSeen: Date.now(),
            source: source
        };
        
        this.userData.users.set(writerId, userActivity);
        this.userData.lastUpdated = Date.now();
        
        // Detect what changed for this user
        const changes = this.detectUserChanges(previousUserActivity, userActivity);
        
        if (changes.length > 0) {
            // Recompute affected activities (games, texts, site-wide)
            this.recomputeAffectedActivities(changes);
            
            // Emit events for all changes
            this.emitActivityEvents(changes);
        }
    }
    
    /**
     * Detect what changed for a user between previous and current activity
     */
    detectUserChanges(previousActivity, currentActivity) {
        const changes = [];
        
        // If no previous activity, this is a new user (initialization)
        if (!previousActivity) {
            if (currentActivity.activity_level === 'active') {
                if (currentActivity.game_id) {
                    // User is in a specific game
                    changes.push({
                        type: 'game_joined',
                        gameId: currentActivity.game_id,
                        userId: currentActivity.writer_id,
                        activityType: this.getActivityCategory(currentActivity.activity_type)
                    });
                } else {
                    // User is browsing (game_id is null) - still counts for site activity
                    changes.push({
                        type: 'user_started_browsing',
                        gameId: null,
                        userId: currentActivity.writer_id,
                        activityType: this.getActivityCategory(currentActivity.activity_type)
                    });
                }
            }
            
            // Also check if the new user is currently editing text (for initialization)
            if (this.isEditingText(currentActivity)) {
                changes.push({
                    type: 'text_editing_started',
                    gameId: currentActivity.game_id,
                    textId: currentActivity.text_id,
                    userId: currentActivity.writer_id,
                    editingType: currentActivity.activity_type
                });
            }
            
            return changes;
        }
        
        // Check for game changes (ensure string comparison)
        const prevGameId = previousActivity.game_id ? String(previousActivity.game_id) : null;
        const currGameId = currentActivity.game_id ? String(currentActivity.game_id) : null;
        
        if (prevGameId !== currGameId) {
            // User left previous game
            if (prevGameId && previousActivity.activity_level === 'active') {
                changes.push({
                    type: 'game_left',
                    gameId: prevGameId,
                    userId: currentActivity.writer_id,
                    activityType: this.getActivityCategory(previousActivity.activity_type)
                });
            }
            
            // User joined new game
            if (currGameId && currentActivity.activity_level === 'active') {
                changes.push({
                    type: 'game_joined',
                    gameId: currGameId,
                    userId: currentActivity.writer_id,
                    activityType: this.getActivityCategory(currentActivity.activity_type)
                });
            }
        }
        
        // Check for activity level changes (active <-> idle)
        if (previousActivity.activity_level !== currentActivity.activity_level) {
            if (currentActivity.activity_level === 'idle' && previousActivity.activity_level === 'active') {
                changes.push({
                    type: 'user_went_idle',
                    gameId: currentActivity.game_id, // Can be null for browsing users
                    userId: currentActivity.writer_id,
                    activityType: this.getActivityCategory(previousActivity.activity_type)
                });
            } else if (currentActivity.activity_level === 'active' && previousActivity.activity_level === 'idle') {
                changes.push({
                    type: 'user_became_active',
                    gameId: currentActivity.game_id, // Can be null for browsing users
                    userId: currentActivity.writer_id,
                    activityType: this.getActivityCategory(currentActivity.activity_type)
                });
            }
        }
        
        // Check for activity type changes within the same game
        if (prevGameId === currGameId && 
            prevGameId && 
            currentActivity.activity_level === 'active' &&
            previousActivity.activity_level === 'active' &&
            previousActivity.activity_type !== currentActivity.activity_type) {
            

            const prevCategory = this.getActivityCategory(previousActivity.activity_type);
            const currCategory = this.getActivityCategory(currentActivity.activity_type);
            
            if (prevCategory !== currCategory) {

                changes.push({
                    type: 'activity_type_changed',
                    gameId: currGameId,
                    userId: currentActivity.writer_id,
                    previousActivityType: prevCategory,
                    currentActivityType: currCategory
                });
            }
        }
        
        // Check for text-level editing changes (iterating, adding_note with text_id)
        const prevTextId = previousActivity?.text_id ? String(previousActivity.text_id) : null;
        const currTextId = currentActivity.text_id ? String(currentActivity.text_id) : null;
        
        // Text editing started (user begins editing a text)
        if (!this.isEditingText(previousActivity) && this.isEditingText(currentActivity)) {

            changes.push({
                type: 'text_editing_started',
                gameId: currentActivity.game_id,
                textId: currTextId,
                userId: currentActivity.writer_id,
                editingType: currentActivity.activity_type
            });
        }
        
        // Text editing stopped (user stops editing)
        if (this.isEditingText(previousActivity) && !this.isEditingText(currentActivity)) {

            changes.push({
                type: 'text_editing_stopped',
                gameId: currentActivity.game_id,
                textId: prevTextId,
                userId: currentActivity.writer_id,
                editingType: previousActivity.activity_type
            });
        }
        
        // Text editing changed (user switches to editing different text or different editing type)
        if (this.isEditingText(previousActivity) && this.isEditingText(currentActivity) &&
            (prevTextId !== currTextId || previousActivity.activity_type !== currentActivity.activity_type)) {
            
            // Stop editing previous text
            if (prevTextId) {
                changes.push({
                    type: 'text_editing_stopped',
                    gameId: currentActivity.game_id,
                    textId: prevTextId,
                    userId: currentActivity.writer_id,
                    editingType: previousActivity.activity_type
                });
            }
            
            // Start editing new text
            if (currTextId) {
                changes.push({
                    type: 'text_editing_started',
                    gameId: currentActivity.game_id,
                    textId: currTextId,
                    userId: currentActivity.writer_id,
                    editingType: currentActivity.activity_type
                });
            }
        }
        

        return changes;
    }
    
    /**
     * Check if user activity represents text editing (iterating or adding_note with text_id)
     */
    isEditingText(userActivity) {
        return userActivity && 
               userActivity.activity_level === 'active' &&
               userActivity.text_id && 
               this.CONFIG.TEXT_EDITING_TYPES.includes(userActivity.activity_type);
    }

    /**
     * Recompute game, text, and site-wide activities for changes
     */
    recomputeAffectedActivities(changes) {
        const affectedGameIds = new Set();
        const affectedTextIds = new Set();
        
        // Collect all affected game IDs and text IDs
        changes.forEach(change => {
            if (change.gameId) {
                affectedGameIds.add(change.gameId);
            }
            if (change.textId) {
                affectedTextIds.add(change.textId);
            }
        });
        
        // Recompute activities for each affected game
        affectedGameIds.forEach(gameId => {
            const gameActivity = this.computeGameActivity(gameId);
            
            // Update or add to derived game activities
            const existingIndex = this.derivedGameActivities.data.findIndex(g => g.game_id === gameId);
            
            if (existingIndex >= 0) {
                this.derivedGameActivities.data[existingIndex] = gameActivity;
            } else {
                this.derivedGameActivities.data.push(gameActivity);
            }
        });
        
        // Recompute activities for each affected text
        affectedTextIds.forEach(textId => {
            const textActivity = this.computeTextActivity(textId);
            
            if (textActivity.activity_type) {
                // Update or add to derived text activities
                const existingIndex = this.derivedTextActivities.data.findIndex(t => t.text_id === textId);
                
                if (existingIndex >= 0) {
                    this.derivedTextActivities.data[existingIndex] = textActivity;
                } else {
                    this.derivedTextActivities.data.push(textActivity);
                }
            } else {
                // Remove text activity if no one is editing
                this.derivedTextActivities.data = this.derivedTextActivities.data.filter(t => t.text_id !== textId);
            }
        });
        
        // Always recompute site-wide activity when any change occurs
        this.recomputeSiteActivity();
        
        this.derivedGameActivities.lastUpdated = Date.now();
        this.derivedTextActivities.lastUpdated = Date.now();
    }
    
    /**
     * Compute current activity for a specific game based on user data
     */
    computeGameActivity(gameId) {
        let browsing = 0;
        let writing = 0;
        
        // Ensure gameId is consistently a string for comparison
        const normalizedGameId = String(gameId);
        
        // Count active users in this game
        this.userData.users.forEach((userActivity, userId) => {
            if (userActivity.game_id === normalizedGameId && userActivity.activity_level === 'active') {
                const category = this.getActivityCategory(userActivity.activity_type);
                
                if (category === 'browsing') {
                    browsing++;
                } else if (category === 'writing') {
                    writing++;
                }
            }
        });
        
        return {
            game_id: normalizedGameId,
            browsing: browsing,
            writing: writing,
            timestamp: Math.floor(Date.now() / 1000)
        };
    }
    
    /**
     * Convert activity_type to browsing/writing category
     */
    getActivityCategory(activityType) {
        const writingTypes = ['iterating', 'adding_note', 'starting_game'];
        return writingTypes.includes(activityType) ? 'writing' : 'browsing';
    }
    
    /**
     * Compute site-wide activity from all active users
     */
    recomputeSiteActivity() {
        let browsing = 0;
        let writing = 0;
        
        // Count all active users across all games
        this.userData.users.forEach((userActivity) => {
            if (userActivity.activity_level === 'active') {
                const category = this.getActivityCategory(userActivity.activity_type);
                if (category === 'browsing') {
                    browsing++;
                } else if (category === 'writing') {
                    writing++;
                }
            }
        });
        
        const previousSiteActivity = { ...this.derivedSiteActivity };
        
        this.derivedSiteActivity = {
            browsing: browsing,
            writing: writing,
            total: browsing + writing,
            lastUpdated: Date.now()
        };
        
        // Log site activity changes for debugging
        if (this.CONFIG.DEBUG || 
            previousSiteActivity.browsing !== browsing || 
            previousSiteActivity.writing !== writing) {
            console.log(`👤 UserActivityDataManager: Site activity computed - Browsing: ${browsing}, Writing: ${writing}, Total: ${browsing + writing}`);
        }
    }
    
    /**
     * Compute current editing activity for a specific text based on user data
     */
    computeTextActivity(textId) {
        // Ensure textId is consistently a string for comparison
        const normalizedTextId = String(textId);
        
        // Find the user currently editing this text (only one can edit at a time)
        let currentEditor = null;
        this.userData.users.forEach((userActivity, userId) => {
            if (this.isEditingText(userActivity) && userActivity.text_id === normalizedTextId) {
                currentEditor = userActivity;
            }
        });
        
        return {
            text_id: normalizedTextId,
            activity_type: currentEditor?.activity_type || null, // 'iterating', 'adding_note', or null
            parent_id: currentEditor?.parent_id || null,
            user_id: currentEditor?.writer_id || null,
            timestamp: Math.floor(Date.now() / 1000)
        };
    }

    /**
     * Emit game, text, and site activity events for changes
     */
    emitActivityEvents(changes) {
        const gameChanges = new Map();
        const textChanges = new Map();
        
        // Group changes by game and text
        changes.forEach(change => {
            if (change.gameId) {
                if (!gameChanges.has(change.gameId)) {
                    gameChanges.set(change.gameId, []);
                }
                gameChanges.get(change.gameId).push(change);
            }
            
            if (change.textId) {
                if (!textChanges.has(change.textId)) {
                    textChanges.set(change.textId, []);
                }
                textChanges.get(change.textId).push(change);
            }
        });
        
        // Emit events for each changed game
        gameChanges.forEach((gameChangeList, gameId) => {
            const gameActivity = this.derivedGameActivities.data.find(g => g.game_id === gameId);
            
            if (gameActivity) {
                const eventData = {
                    gameId: gameActivity.game_id,
                    browsing: gameActivity.browsing,
                    writing: gameActivity.writing,
                    timestamp: gameActivity.timestamp,
                    source: 'user-centric'
                };
                
                eventBus.emit('gameActivityChanged', eventData);
            }
        });
        
        // Emit events for each changed text
        textChanges.forEach((textChangeList, textId) => {
            const textActivity = this.derivedTextActivities.data.find(t => t.text_id === textId);
            
            // Always emit text activity events (including when editing stops - textActivity will be null)
            const eventData = {
                textId: textId,
                activity_type: textActivity?.activity_type || null, // 'iterating', 'adding_note', or null
                parent_id: textActivity?.parent_id || null,
                user_id: textActivity?.user_id || null,
                timestamp: textActivity?.timestamp || Math.floor(Date.now() / 1000),
                source: 'user-centric',
                changes: textChangeList.map(c => ({ type: c.type, editingType: c.editingType }))
            };
            console.log('👤 UserActivityDataManager: HERE Emitting textActivityChanged event:', eventData);
            
            eventBus.emit('textActivityChanged', eventData);
        });
        
        // Always emit site activity update when any user activity changes
        if (changes.length > 0) {
            const siteEventData = {
                browsing: this.derivedSiteActivity.browsing,
                writing: this.derivedSiteActivity.writing,
                total: this.derivedSiteActivity.total,
                timestamp: Math.floor(Date.now() / 1000),
                source: 'user-centric'
            };
            
            console.log('👤 UserActivityDataManager: Emitting derived site activity:', siteEventData);
            console.log('👤 UserActivityDataManager: Changes that triggered emission:', changes.map(c => c.type));
            eventBus.emit('siteActivityUpdate', siteEventData);
            console.log('👤 UserActivityDataManager: siteActivityUpdate event emitted');
            
            // Test to verify the event bus is working
            eventBus.emit('test-event', { testData: 'Event bus is working', timestamp: Date.now() });
        } else {
            console.log('👤 UserActivityDataManager: No changes detected, skipping site activity emission');
        }
    }
    
    /**
     * Start cleanup timer to remove stale user activities
     */
    startCleanupTimer() {
        // Clean up every 2 minutes
        this.cleanupTimer = setInterval(() => {
            this.cleanupStaleUsers();
        }, this.CONFIG.CLEANUP_INTERVAL);
    }
    
    /**
     * Remove user activities that haven't been seen for too long
     */
    cleanupStaleUsers() {
        const now = Date.now();
        const staleThreshold = this.CONFIG.STALE_THRESHOLD; // 10 minutes
        const staleUsers = [];
        
        this.userData.users.forEach((userActivity, writerId) => {
            if (now - userActivity.lastSeen > staleThreshold) {
                staleUsers.push(writerId);
            }
        });
        
        if (staleUsers.length > 0) {
            if (this.CONFIG.DEBUG) console.log(`👤 UserActivityDataManager: Cleaning up ${staleUsers.length} stale users:`, staleUsers);
            
            // Track games that need recomputation
            const affectedGames = new Set();
            
            staleUsers.forEach(writerId => {
                const userActivity = this.userData.users.get(writerId);
                if (userActivity && userActivity.game_id && userActivity.activity_level === 'active') {
                    affectedGames.add(userActivity.game_id);
                }
                this.userData.users.delete(writerId);
            });
            
            // Recompute affected games
            if (affectedGames.size > 0) {
                const changes = Array.from(affectedGames).map(gameId => ({
                    type: 'cleanup',
                    gameId: gameId
                }));
                
                this.recomputeAffectedActivities(changes);
                this.emitActivityEvents(changes);
            }
        }
    }
    
        // === GETTER METHODS ===
    
    /**
     * Get current site-wide activity (NEW - replaces direct SSE site activity)
     */
    getSiteActivity() {
        return {
            browsing: this.derivedSiteActivity.browsing,
            writing: this.derivedSiteActivity.writing,
            total: this.derivedSiteActivity.total,
            lastUpdated: this.derivedSiteActivity.lastUpdated
        };
    }

    /**
     * Get diagnostic information about current user states (for debugging)
     */
    getDiagnosticInfo() {
        const activeUsers = [];
        const idleUsers = [];
        
        this.userData.users.forEach((userActivity, userId) => {
            const info = {
                userId: userId,
                activity_level: userActivity.activity_level,
                activity_type: userActivity.activity_type,
                category: this.getActivityCategory(userActivity.activity_type),
                game_id: userActivity.game_id,
                lastSeen: new Date(userActivity.lastSeen).toLocaleTimeString()
            };
            
            if (userActivity.activity_level === 'active') {
                activeUsers.push(info);
            } else {
                idleUsers.push(info);
            }
        });
        
        return {
            totalUsers: this.userData.users.size,
            activeUsers: activeUsers,
            idleUsers: idleUsers,
            siteActivity: this.getSiteActivity(),
            gameActivities: this.getDerivedGameActivities(),
            textActivities: this.getDerivedTextActivities()
        };
    }

    /**
     * Get current user activities (for debugging/admin purposes)
     */
    getUserActivities() {
        return Array.from(this.userData.users.values());
    }

    /**
     * Get derived game activities (for debugging/admin purposes)
     */
    getDerivedGameActivities() {
        return [...this.derivedGameActivities.data];
    }
    
    /**
     * Get activity for a specific game (matches activityDataManager format)
     */
    getGameActivity(gameId) {
        const gameActivity = this.derivedGameActivities.data.find(g => g.game_id === gameId);
        if (gameActivity) {
            return {
                browsing: gameActivity.browsing,
                writing: gameActivity.writing,
                timestamp: gameActivity.timestamp,
                game_id: gameActivity.game_id // Keep both formats for compatibility
            };
        }
        return null;
    }

    /**
     * Get derived text activities (for debugging/admin purposes)
     */
    getDerivedTextActivities() {
        return [...this.derivedTextActivities.data];
    }

    /**
     * Get editing activity for a specific text (simplified format)
     */
    getTextActivity(textId) {
        const textActivity = this.derivedTextActivities.data.find(t => t.text_id === textId);
        if (textActivity) {
            return {
                activity_type: textActivity.activity_type, // 'iterating', 'adding_note', or null
                parent_id: textActivity.parent_id,
                user_id: textActivity.user_id,
                timestamp: textActivity.timestamp
            };
        }
        return null;
    }

    normalizeUserActivityData(data, source = 'unknown') {
        const baseData = source === 'heartbeat' ? this.convertHeartbeatFormat(data) : data;
        
        return {
            writer_id: String(baseData.writer_id || baseData.user_id),
            activity_type: baseData.activity_type,
            activity_level: baseData.activity_level,
            page_type: baseData.page_type,
            game_id: baseData.game_id ? String(baseData.game_id) : null,
            text_id: baseData.text_id ? String(baseData.text_id) : null,
            parent_id: baseData.parent_id ? String(baseData.parent_id) : null,
            timestamp: this.normalizeTimestamp(baseData.timestamp)
        };
    }

    convertHeartbeatFormat(heartbeatEvent) {
        const activity = heartbeatEvent.activity;
        const userId = window.currentActivityManagerInstance?.currentUserId;
        
        return {
            writer_id: userId,
            activity_type: activity.activity_type,
            activity_level: activity.activity_level,
            page_type: activity.page_type,
            game_id: activity.game_id,
            text_id: activity.text_id,
            parent_id: activity.parent_id,
            timestamp: heartbeatEvent.timestamp
        };
    }

    normalizeTimestamp(timestamp) {
        if (!timestamp) return Math.floor(Date.now() / 1000);
        return typeof timestamp === 'number' && timestamp > 1000000000000 
            ? Math.floor(timestamp / 1000) 
            : timestamp;
    }
} 