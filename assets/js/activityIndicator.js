import { eventBus } from './eventBus.js';

/**
 * ACTIVITY INDICATORS - MODULAR DESIGN
 * 
 * 🔥 EASY HEADER REMOVAL GUIDE:
 * To remove the header activity indicator (when done testing):
 * 
 * 1. DELETE the entire HeaderActivityIndicator class (lines ~70-130)
 * 2. REMOVE this line in ActivityIndicator constructor:
 *    this.headerIndicator = new HeaderActivityIndicator();
 * 3. REMOVE header indicator from destroy method:
 *    if (this.headerIndicator) { this.headerIndicator.destroy(); }
 * 4. DELETE the header HTML from view/header.php (search for "header-activity-indicator")
 * 5. DELETE activity-indicator.css from assets/css/elements/
 * 
 * That's it! Footer indicator will continue working independently.
 */

// === FOOTER ACTIVITY INDICATOR (PERMANENT) ===
export class FooterActivityIndicator {
    constructor() {
        this.container = null;
        this.activityData = { browsing: 0, writing: 0, total: 0 };
        this.isSSEConnected = false;
        
        console.log('🔔 FooterActivityIndicator: Initializing');
        this.init();
    }

    init() {
        this.createIndicator();
        this.setupEventListeners();
        console.log('🔔 FooterActivityIndicator: Initialization complete');
    }

    createIndicator() {
        this.container = document.getElementById('footer-activity-indicator');
        if (!this.container) {
            console.error('🔔 FooterActivityIndicator: Footer indicator not found in DOM');
            return;
        }
        console.log('🔔 FooterActivityIndicator: Found footer indicator in DOM');
    }

    setupEventListeners() {
        if (!this.container) return;
        
        // Listen for site-wide activity updates
        eventBus.on('siteActivityUpdate', (data) => {
            console.log('🔔 FooterActivityIndicator: Received activity update:', data);
            this.updateDisplay(data);
        });

        // Listen for SSE connection status
        eventBus.on('sseConnected', () => {
            this.isSSEConnected = true;
        });

        eventBus.on('sseFailed', () => {
            this.isSSEConnected = false;
        });
    }

    updateDisplay(data) {
        if (!this.container) return;
        
        const browsing = data.browsing || 0;
        const writing = data.writing || 0;
        const total = browsing + writing;
        
        // Store the data
        this.activityData = { browsing, writing, total };

        // Update footer display: "browsing:writing" format
        const activityNumbers = this.container.querySelector('.activity-numbers');
        if (activityNumbers) {
            activityNumbers.textContent = `${browsing}:${writing}`;
        }

        // Update appearance based on activity
        this.container.classList.toggle('has-activity', total > 0);
        
        console.log('🔔 FooterActivityIndicator: Updated - Browsing:', browsing, 'Writing:', writing);
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        console.log('🔔 FooterActivityIndicator: Destroyed');
    }
}

// === HEADER ACTIVITY INDICATOR (TESTING ONLY - EASILY REMOVABLE) ===
export class HeaderActivityIndicator {
    constructor() {
        this.container = null;
        this.activityData = { browsing: 0, writing: 0, total: 0 };
        this.isSSEConnected = false;
        
        console.log('🔔 HeaderActivityIndicator: Initializing (testing mode)');
        this.init();
    }

    init() {
        this.createIndicator();
        this.setupEventListeners();
        console.log('🔔 HeaderActivityIndicator: Initialization complete');
    }

    createIndicator() {
        this.container = document.getElementById('header-activity-indicator');
        if (!this.container) {
            console.warn('🔔 HeaderActivityIndicator: Header indicator not found in DOM (this is optional)');
            return;
        }
        console.log('🔔 HeaderActivityIndicator: Found header indicator in DOM');
    }

    setupEventListeners() {
        if (!this.container) return;
        
        // Listen for site-wide activity updates
        eventBus.on('siteActivityUpdate', (data) => {
            console.log('🔔 HeaderActivityIndicator: Received activity update:', data);
            this.updateDisplay(data);
        });

        // Listen for SSE connection status
        eventBus.on('sseConnected', () => {
            this.isSSEConnected = true;
        });

        eventBus.on('sseFailed', () => {
            this.isSSEConnected = false;
        });
    }

    updateDisplay(data) {
        if (!this.container) return;
        
        const browsing = data.browsing || 0;
        const writing = data.writing || 0;
        const total = browsing + writing;
        
        // Store the data
        this.activityData = { browsing, writing, total };

        // Update header display: detailed format with labels
        const totalCount = this.container.querySelector('.activity-count.total');
        const editingCount = this.container.querySelector('.activity-count.editing');
        
        if (totalCount) {
            totalCount.textContent = browsing;
        }
        
        if (editingCount) {
            editingCount.textContent = writing;
        }

        // Update appearance based on activity
        this.container.classList.toggle('has-activity', total > 0);
        
        console.log('🔔 HeaderActivityIndicator: Updated - Browsing:', browsing, 'Writing:', writing);
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        console.log('🔔 HeaderActivityIndicator: Destroyed');
    }
}

// === MAIN ACTIVITY INDICATOR MANAGER ===
export class ActivityIndicator {
    constructor() {
        if (window.activityIndicatorInstance) {
            return window.activityIndicatorInstance;
        }

        console.log('🔔 ActivityIndicator: Initializing manager with separate header/footer indicators');
        
        // Initialize footer indicator (permanent)
        this.footerIndicator = new FooterActivityIndicator();
        
        // Initialize header indicator (testing only - easily removable)
        this.headerIndicator = new HeaderActivityIndicator();
        
        window.activityIndicatorInstance = this;
        console.log('🔔 ActivityIndicator: Manager initialization complete');
    }

    // Legacy method for compatibility
    updateDisplay(data) {
        // Both indicators handle their own updates via event listeners
        // This method exists for backward compatibility but isn't needed
        console.log('🔔 ActivityIndicator: Legacy updateDisplay called - indicators handle updates automatically');
    }

    destroy() {
        console.log('🔔 ActivityIndicator: Destroying all indicators');
        
        if (this.footerIndicator) {
            this.footerIndicator.destroy();
        }
        
        if (this.headerIndicator) {
            this.headerIndicator.destroy();
        }
        
        window.activityIndicatorInstance = null;
        console.log('🔔 ActivityIndicator: All indicators destroyed');
    }
} 