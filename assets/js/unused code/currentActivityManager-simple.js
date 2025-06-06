import { eventBus } from '../eventBus.js';

export class CurrentActivityManager {
    constructor() {
        if (window.currentActivityManagerInstance) {
            return window.currentActivityManagerInstance;
        }

        // Simple activity state
        this.currentActivity = {
            activity_type: 'browsing',     // 'browsing', 'editing', 'starting_game'
            activity_level: 'active',      // 'active', 'idle'
            page_type: 'other',            // 'game_list', 'text_form', 'collab_page', 'home', 'other'
            game_id: null,
            text_id: null,
            parent_id: null
        };

        // Timing settings
        this.heartbeatInterval = 30000; // 30 seconds
        this.idleTimeout = 300000;      // 5 minutes (increased from 2 minutes)
        this.heartbeatTimer = null;
        this.idleTimer = null;
        this.lastActivity = Date.now();

        // User engagement tracking
        this.userEngaged = true;
        this.mouseMovements = 0;
        this.keystrokes = 0;
        this.scrolls = 0;

        // Get user ID
        const userIdMeta = document.querySelector('meta[name="user"]');
        this.currentUserId = userIdMeta?.getAttribute('data-user-id') !== 'null' ? 
                           userIdMeta?.getAttribute('data-user-id') : null;

        console.log('🎯 Simple ActivityManager: Initializing with user ID:', this.currentUserId);
        
        window.currentActivityManagerInstance = this;
        this.init();
    }

    init() {
        console.log('🎯 Simple ActivityManager: Starting initialization');
        
        // Step 1: Detect page type
        this.detectPageType();
        
        // Step 2: Try to get game context
        this.detectGameContext();
        
        // Step 3: Set up basic event listeners
        this.setupBasicListeners();
        
        // Step 4: Start tracking
        this.startTracking();
        
        console.log('🎯 Simple ActivityManager: Initialized:', this.currentActivity);
    }

    detectPageType() {
        console.log('🎯 Simple ActivityManager: Detecting page type...');
        
        // Check for actual DOM elements that exist in your app
        if (document.querySelector('[data-stories]')) {
            this.currentActivity.page_type = 'game_list';
        } else if (document.querySelector('[data-one-story]')) {
            this.currentActivity.page_type = 'collab_page';
        } else if (document.querySelector('[data-form-type]')) {
            this.currentActivity.page_type = 'text_form';
        } else if (document.querySelector('.home-container')) {
            this.currentActivity.page_type = 'home';
        } else {
            this.currentActivity.page_type = 'other';
        }
        
        console.log('🎯 Simple ActivityManager: Page type:', this.currentActivity.page_type);
    }

    detectGameContext() {
        console.log('🎯 Simple ActivityManager: Detecting game context...');
        
        // Method 1: Try to get from DOM element (your preferred approach)
        const currentRootId = window.dataManager?.getCurrentViewedRootStoryId();
        console.log('🎯 Simple ActivityManager: Current root ID:', currentRootId);
        
        if (currentRootId) {
            // Look for the story element with matching text_id
            const storyElement = document.querySelector(`[data-text-id="${currentRootId}"]`);
            if (storyElement) {
                const gameId = storyElement.getAttribute('data-game-id');
                if (gameId) {
                    this.currentActivity.game_id = gameId;
                    this.currentActivity.text_id = currentRootId; // This is the root story ID
                    console.log('🎯 Simple ActivityManager: Found context from DOM - game_id:', gameId, 'root_text_id:', currentRootId);
                    return;
                }
            }
            
            // Method 2: Fallback to dataManager cache
            if (window.dataManager?.storyCache?.games) {
                const games = window.dataManager.storyCache.games;
                for (const [gameId, gameInfo] of Object.entries(games)) {
                    if (gameInfo.data && gameInfo.data.text_id === currentRootId) {
                        this.currentActivity.game_id = gameInfo.data.game_id;
                        this.currentActivity.text_id = currentRootId;
                        console.log('🎯 Simple ActivityManager: Found context from cache - game_id:', gameInfo.data.game_id);
                        return;
                    }
                }
            }
        }
        
        console.log('🎯 Simple ActivityManager: No game context found');
    }

    setupBasicListeners() {
        console.log('🎯 Simple ActivityManager: Setting up basic listeners');
        
        // User engagement tracking
        document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
        document.addEventListener('keydown', this.handleKeydown.bind(this), { passive: true });
        document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        document.addEventListener('click', this.handleUserActivity.bind(this), { passive: true });
        
        // Page visibility
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Basic event bus listeners (only the ones we know exist)
        if (window.eventBus) {
            eventBus.on('showcaseChanged', (rootStoryId) => {
                console.log('🎯 Simple ActivityManager: Showcase changed to:', rootStoryId);
                this.updateGameContext(rootStoryId);
            });
        }
    }

    handleMouseMove() {
        this.mouseMovements++;
        this.handleUserActivity();
    }

    handleKeydown() {
        this.keystrokes++;
        this.handleUserActivity();
    }

    handleScroll() {
        this.scrolls++;
        this.handleUserActivity();
    }

    handleUserActivity() {
        this.lastActivity = Date.now();
        
        // If user was idle, mark as active
        if (this.currentActivity.activity_level === 'idle') {
            console.log('🎯 Simple ActivityManager: User became active');
            this.setActivityLevel('active');
        }
        
        // Reset idle timer
        this.resetIdleTimer();
    }

    handleVisibilityChange() {
        if (document.hidden) {
            console.log('🎯 Simple ActivityManager: Page hidden - setting idle');
            this.setActivityLevel('idle');
        } else {
            console.log('🎯 Simple ActivityManager: Page visible - resuming activity');
            this.handleUserActivity();
        }
    }

    resetIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        
        this.idleTimer = setTimeout(() => {
            // Check if user has been engaged recently
            const timeSinceActivity = Date.now() - this.lastActivity;
            const engagementScore = this.mouseMovements + this.keystrokes + this.scrolls;
            
            console.log('🎯 Simple ActivityManager: Idle check - time since activity:', timeSinceActivity, 'engagement score:', engagementScore);
            
            if (timeSinceActivity >= this.idleTimeout && engagementScore < 5) {
                console.log('🎯 Simple ActivityManager: Setting user as idle');
                this.setActivityLevel('idle');
            }
            
            // Reset engagement counters
            this.mouseMovements = 0;
            this.keystrokes = 0;
            this.scrolls = 0;
        }, this.idleTimeout);
    }

    setActivityType(type) {
        if (this.currentActivity.activity_type !== type) {
            console.log('🎯 Simple ActivityManager: Activity type changed:', this.currentActivity.activity_type, '->', type);
            this.currentActivity.activity_type = type;
            this.sendHeartbeat();
        }
    }

    setActivityLevel(level) {
        if (this.currentActivity.activity_level !== level) {
            console.log('🎯 Simple ActivityManager: Activity level changed:', this.currentActivity.activity_level, '->', level);
            this.currentActivity.activity_level = level;
            this.sendHeartbeat();
        }
    }

    updateGameContext(rootStoryId) {
        console.log('🎯 Simple ActivityManager: Updating game context for root:', rootStoryId);
        
        if (rootStoryId) {
            // Try DOM method first
            const storyElement = document.querySelector(`[data-text-id="${rootStoryId}"]`);
            if (storyElement) {
                const gameId = storyElement.getAttribute('data-game-id');
                if (gameId) {
                    this.currentActivity.game_id = gameId;
                    this.currentActivity.text_id = rootStoryId;
                    console.log('🎯 Simple ActivityManager: Updated context from DOM - game_id:', gameId);
                    this.sendHeartbeat();
                    return;
                }
            }
        }
        
        // Clear context if no valid root story
        this.currentActivity.game_id = null;
        this.currentActivity.text_id = null;
        console.log('🎯 Simple ActivityManager: Cleared game context');
        this.sendHeartbeat();
    }

    startTracking() {
        console.log('🎯 Simple ActivityManager: Starting tracking');
        
        // Send initial heartbeat
        this.sendHeartbeat();
        
        // Set up heartbeat interval
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, this.heartbeatInterval);
        
        // Start idle detection
        this.resetIdleTimer();
    }

    stopTracking() {
        console.log('🎯 Simple ActivityManager: Stopping tracking');
        
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
            console.log('🎯 Simple ActivityManager: No user ID, skipping heartbeat');
            return;
        }

        const payload = {
            writer_id: this.currentUserId,
            activity_type: this.currentActivity.activity_type,
            activity_level: this.currentActivity.activity_level,
            page_type: this.currentActivity.page_type,
            game_id: this.currentActivity.game_id,
            text_id: this.currentActivity.text_id,
            parent_id: this.currentActivity.parent_id
        };

        console.log('🎯 Simple ActivityManager: Sending heartbeat:', payload);

        try {
            const url = window.i18n?.createUrl('writerActivity/store') || '/writerActivity/store';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('🎯 Simple ActivityManager: Heartbeat sent successfully:', result);
            } else {
                console.error('🎯 Simple ActivityManager: Heartbeat failed:', response.status);
            }
        } catch (error) {
            console.error('🎯 Simple ActivityManager: Heartbeat error:', error);
        }
    }

    getCurrentActivity() {
        return { ...this.currentActivity };
    }

    // Simple public methods for testing
    simulateEditing() {
        this.setActivityType('editing');
    }

    simulateBrowsing() {
        this.setActivityType('browsing');
    }

    simulateIdle() {
        this.setActivityLevel('idle');
    }

    simulateActive() {
        this.setActivityLevel('active');
    }
} 