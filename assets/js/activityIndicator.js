import { eventBus } from './eventBus.js';

export class ActivityIndicator {
    constructor() {
        if (window.activityIndicatorInstance) {
            return window.activityIndicatorInstance;
        }

        this.isOpen = false;
        this.activityData = {
            editing: { active: 0, idle: 0, total: 0 },
            browsing: { active: 0, idle: 0, total: 0 },
            starting_game: { active: 0, idle: 0, total: 0 },
            total_active: 0,
            total_idle: 0,
            total_users: 0
        };
        
        this.updateInterval = 60000; // Update every minute
        this.updateTimer = null;

        console.log('🔔 ActivityIndicator: Initializing');
        
        window.activityIndicatorInstance = this;
        this.init();
    }

    init() {
        console.log('🔔 ActivityIndicator: Starting initialization');
        
        this.createIndicator();
        this.setupEventListeners();
        this.startPeriodicUpdates();
        
        console.log('🔔 ActivityIndicator: Initialization complete');
    }

    createIndicator() {
        console.log('🔔 ActivityIndicator: Creating indicator DOM elements');
        
        // Create the main container
        this.container = document.createElement('div');
        this.container.className = 'activity-indicator';
        this.container.innerHTML = `
            <div class="activity-toggle" title="Current Activity">
                <span class="activity-icon">👥</span>
                <span class="activity-count">0</span>
            </div>
            <div class="activity-panel">
                <div class="activity-header">
                    <h4>Current Activity</h4>
                    <button class="activity-close">×</button>
                </div>
                <div class="activity-content">
                    <div class="activity-summary">
                        <div class="activity-stat">
                            <span class="stat-label">Active Users:</span>
                            <span class="stat-value active-count">0</span>
                        </div>
                        <div class="activity-stat">
                            <span class="stat-label">Idle Users:</span>
                            <span class="stat-value idle-count">0</span>
                        </div>
                    </div>
                    <div class="activity-breakdown">
                        <div class="activity-type">
                            <span class="type-label">📝 Editing:</span>
                            <span class="type-count editing-count">0</span>
                        </div>
                        <div class="activity-type">
                            <span class="type-label">👀 Browsing:</span>
                            <span class="type-count browsing-count">0</span>
                        </div>
                        <div class="activity-type">
                            <span class="type-label">🎮 Starting Games:</span>
                            <span class="type-count starting-count">0</span>
                        </div>
                    </div>
                    <div class="activity-footer">
                        <small>Updates every minute</small>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(this.container);
        
        console.log('🔔 ActivityIndicator: DOM elements created and added to page');
    }

    setupEventListeners() {
        console.log('🔔 ActivityIndicator: Setting up event listeners');
        
        // Toggle panel
        const toggle = this.container.querySelector('.activity-toggle');
        toggle.addEventListener('click', () => {
            console.log('🔔 ActivityIndicator: Toggle clicked, current state:', this.isOpen);
            this.togglePanel();
        });

        // Close panel
        const closeBtn = this.container.querySelector('.activity-close');
        closeBtn.addEventListener('click', () => {
            console.log('🔔 ActivityIndicator: Close button clicked');
            this.closePanel();
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.container.contains(e.target)) {
                console.log('🔔 ActivityIndicator: Outside click detected, closing panel');
                this.closePanel();
            }
        });

        // Listen for activity heartbeats
        eventBus.on('activityHeartbeat', (data) => {
            console.log('🔔 ActivityIndicator: Received activity heartbeat:', data);
            this.fetchActivityData();
        });

        // Listen for showcase changes to update context
        eventBus.on('showcaseChanged', (rootStoryId) => {
            console.log('🔔 ActivityIndicator: Showcase changed, updating activity data for:', rootStoryId);
            this.fetchActivityData();
        });
    }

    togglePanel() {
        console.log('🔔 ActivityIndicator: Toggling panel from', this.isOpen, 'to', !this.isOpen);
        
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    openPanel() {
        console.log('🔔 ActivityIndicator: Opening panel');
        
        this.isOpen = true;
        this.container.classList.add('open');
        this.fetchActivityData(); // Refresh data when opening
    }

    closePanel() {
        console.log('🔔 ActivityIndicator: Closing panel');
        
        this.isOpen = false;
        this.container.classList.remove('open');
    }

    async fetchActivityData() {
        console.log('🔔 ActivityIndicator: Fetching activity data');
        
        try {
            // Get current context (game/text being viewed)
            const context = this.getCurrentContext();
            console.log('🔔 ActivityIndicator: Current context:', context);
            
            const endpoint = 'writerActivity/getActivityCounts';
            const url = window.i18n.createUrl(endpoint);
            
            const params = new URLSearchParams();
            if (context.gameId) params.append('gameId', context.gameId);
            if (context.textId) params.append('textId', context.textId);
            if (context.pageType) params.append('pageType', context.pageType);
            
            const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
            console.log('🔔 ActivityIndicator: Fetching from URL:', fullUrl);
            
            const response = await fetch(fullUrl);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('🔔 ActivityIndicator: Fetch failed:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('🔔 ActivityIndicator: Received activity data:', data);
            
            this.updateDisplay(data);

        } catch (error) {
            console.error('🔔 ActivityIndicator: Error fetching activity data:', error);
            this.showError();
        }
    }

    getCurrentContext() {
        // Try to get context from current activity manager
        if (window.currentActivityManagerInstance) {
            const activity = window.currentActivityManagerInstance.getCurrentActivity();
            console.log('🔔 ActivityIndicator: Got context from activity manager:', activity);
            return {
                gameId: activity.game_id,
                textId: activity.text_id,
                pageType: activity.page_type
            };
        }

        // Fallback to DOM detection
        const context = { gameId: null, textId: null, pageType: 'other' };
        
        if (document.querySelector('[data-stories]')) {
            context.pageType = 'game_list';
        } else if (document.querySelector('[data-form-type]')) {
            context.pageType = 'text_form';
        }
        
        console.log('🔔 ActivityIndicator: Fallback context from DOM:', context);
        return context;
    }

    updateDisplay(data) {
        console.log('🔔 ActivityIndicator: Updating display with data:', data);
        
        this.activityData = data;

        // Update toggle count (total active users)
        const toggleCount = this.container.querySelector('.activity-count');
        toggleCount.textContent = data.total_active || 0;
        
        // Update panel content
        this.container.querySelector('.active-count').textContent = data.total_active || 0;
        this.container.querySelector('.idle-count').textContent = data.total_idle || 0;
        this.container.querySelector('.editing-count').textContent = data.editing?.total || 0;
        this.container.querySelector('.browsing-count').textContent = data.browsing?.total || 0;
        this.container.querySelector('.starting-count').textContent = data.starting_game?.total || 0;

        // Update toggle appearance based on activity
        const toggle = this.container.querySelector('.activity-toggle');
        toggle.classList.toggle('has-activity', (data.total_active || 0) > 0);
        
        console.log('🔔 ActivityIndicator: Display updated successfully');
    }

    showError() {
        console.log('🔔 ActivityIndicator: Showing error state');
        
        const toggleCount = this.container.querySelector('.activity-count');
        toggleCount.textContent = '?';
        
        // Could add error styling here
        this.container.classList.add('error');
        setTimeout(() => {
            this.container.classList.remove('error');
        }, 3000);
    }

    startPeriodicUpdates() {
        console.log('🔔 ActivityIndicator: Starting periodic updates every', this.updateInterval + 'ms');
        
        // Initial fetch
        this.fetchActivityData();
        
        // Set up interval
        this.updateTimer = setInterval(() => {
            console.log('🔔 ActivityIndicator: Periodic update triggered');
            this.fetchActivityData();
        }, this.updateInterval);
    }

    stopPeriodicUpdates() {
        console.log('🔔 ActivityIndicator: Stopping periodic updates');
        
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    destroy() {
        console.log('🔔 ActivityIndicator: Destroying instance');
        
        this.stopPeriodicUpdates();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        window.activityIndicatorInstance = null;
    }
} 