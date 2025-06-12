import { eventBus } from './eventBus.js';

export class ActivityIndicator {
    constructor() {
        if (window.activityIndicatorInstance) {
            return window.activityIndicatorInstance;
        }

        this.isOpen = false;
        this.activityData = {
            browsing: 0,
            writing: 0,
            total: 0
        };
        this.isSSEConnected = false; // Track SSE connection status

        console.log('🔔 ActivityIndicator: Initializing simple version');
        
        window.activityIndicatorInstance = this;
        this.init();
    }

    init() {
        console.log('🔔 ActivityIndicator: Starting initialization');
        
        this.createIndicator();
        this.setupEventListeners();
        
        console.log('🔔 ActivityIndicator: Initialization complete');
    }

    createIndicator() {
        console.log('🔔 ActivityIndicator: Creating indicator DOM elements');
        
        // Create the main container
        this.container = document.createElement('div');
        this.container.className = 'activity-indicator';
        this.container.innerHTML = `
            <div class="activity-toggle" title="Site Activity">
                <span class="activity-icon">👥</span>
                <span class="activity-count">0</span>
            </div>
            <div class="activity-panel">
                <div class="activity-header">
                    <h4>Site Activity</h4>
                    <button class="activity-close">×</button>
                </div>
                <div class="activity-content">
                    <div class="activity-breakdown">
                        <div class="activity-type">
                            <span class="type-label">👀 Browsing:</span>
                            <span class="type-count browsing-count">0</span>
                        </div>
                        <div class="activity-type">
                            <span class="type-label">✍️ Writing:</span>
                            <span class="type-count writing-count">0</span>
                        </div>
                    </div>
                    <div class="activity-footer">
                        <small>Real-time updates</small>
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
        
        // Test if we can receive ANY events
        eventBus.on('test-event', (data) => {
            console.log('🔔 ActivityIndicator: Received test event:', data);
        });
        
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

        // Listen for site-wide activity updates from SSE/polling
        eventBus.on('siteActivityUpdate', (siteActivityData) => {
            console.log('🔔 ActivityIndicator: ===== RECEIVED SITE ACTIVITY UPDATE =====');
            console.log('🔔 ActivityIndicator: Timestamp:', new Date().toISOString());
            console.log('🔔 ActivityIndicator: Data:', siteActivityData);
            console.log('🔔 ActivityIndicator: Data source:', siteActivityData.source || 'unknown');
            console.log('🔔 ActivityIndicator: Current activity data before update:', this.activityData);
            this.updateDisplay(siteActivityData);
            console.log('🔔 ActivityIndicator: Current activity data after update:', this.activityData);
            console.log('🔔 ActivityIndicator: ===== END SITE ACTIVITY UPDATE =====');
        });

        // Listen for SSE connection status to properly track update source
        eventBus.on('sseConnected', () => {
            console.log('🔔 ActivityIndicator: SSE connected - future updates will be real-time');
            this.isSSEConnected = true;
        });

        eventBus.on('sseFailed', () => {
            console.log('🔔 ActivityIndicator: SSE failed - updates will be from polling fallback');
            this.isSSEConnected = false;
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
    }

    closePanel() {
        console.log('🔔 ActivityIndicator: Closing panel');
        
        this.isOpen = false;
        this.container.classList.remove('open');
    }

    updateDisplay(data) {
        console.log('🔔 ActivityIndicator: Updating display with data:', data);
        console.log('🔔 ActivityIndicator: Update source:', this.isSSEConnected ? 'SSE (real-time)' : 'Polling (fallback)');
        
        // Handle simplified site-wide data format
        const browsing = data.browsing || 0;
        const writing = data.writing || 0;
        const total = browsing + writing;
        
        console.log('🔔 ActivityIndicator: Parsed values - Browsing:', browsing, 'Writing:', writing, 'Total:', total);
        
        // Store the data
        this.activityData = {
            browsing: browsing,
            writing: writing,
            total: total
        };

        // Update toggle count (total active users)
        const toggleCount = this.container.querySelector('.activity-count');
        const oldToggleCount = toggleCount.textContent;
        toggleCount.textContent = total;
        console.log('🔔 ActivityIndicator: Updated toggle count from', oldToggleCount, 'to', total);
        
        // Update panel content
        const browsingCountElement = this.container.querySelector('.browsing-count');
        const writingCountElement = this.container.querySelector('.writing-count');
        const oldBrowsingCount = browsingCountElement.textContent;
        const oldWritingCount = writingCountElement.textContent;
        
        browsingCountElement.textContent = browsing;
        writingCountElement.textContent = writing;
        
        console.log('🔔 ActivityIndicator: Updated panel - Browsing from', oldBrowsingCount, 'to', browsing, ', Writing from', oldWritingCount, 'to', writing);

        // Update toggle appearance based on activity
        const toggle = this.container.querySelector('.activity-toggle');
        const hadActivity = toggle.classList.contains('has-activity');
        toggle.classList.toggle('has-activity', total > 0);
        
        if (hadActivity !== (total > 0)) {
            console.log('🔔 ActivityIndicator: Activity state changed from', hadActivity, 'to', total > 0);
        }
        
        console.log('🔔 ActivityIndicator: Display updated - Browsing:', browsing, 'Writing:', writing, 'Total:', total);
    }

    destroy() {
        console.log('🔔 ActivityIndicator: Destroying instance');
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        window.activityIndicatorInstance = null;
    }
} 