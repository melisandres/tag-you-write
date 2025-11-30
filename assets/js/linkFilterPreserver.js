import { eventBus } from './eventBus.js';

/**
 * LinkFilterPreserver - Updates link hrefs to preserve current filters/search
 * Only initializes on dashboard page
 * Listens for filterApplied and searchApplied events
 */
export class LinkFilterPreserver {
    constructor() {
        // Only initialize on dashboard page
        if (!document.querySelector('.dashboard')) {
            return;
        }
        
        this.dataManager = window.dataManager;
        if (!this.dataManager) {
            console.error('LinkFilterPreserver: DataManager not found');
            return;
        }
        
        // Cache all links with data-preserve-filters attribute on init
        // This avoids searching DOM every time filters/search change
        this.cachedLinks = this.findPreservableLinks();
        
        if (this.cachedLinks.length === 0) {
            console.log('LinkFilterPreserver: No links with data-preserve-filters found');
            return;
        }
        
        console.log(`LinkFilterPreserver: Found ${this.cachedLinks.length} links to preserve filters/search`);
        
        // Listen for filter/search changes
        eventBus.on('filterApplied', () => this.updateAllLinks());
        eventBus.on('searchApplied', () => this.updateAllLinks());
        
        // Listen for dynamically added links (single link)
        eventBus.on('linkAdded', (data) => this.handleLinkAdded(data.link));
        
        // Listen for dynamically added links (multiple links)
        eventBus.on('linksAdded', (data) => this.handleLinksAdded(data.links));
        
        // Initial update to ensure links are correct on page load
        this.updateAllLinks();
    }
    
    /**
     * Find all links with data-preserve-filters attribute
     * Caches them to avoid DOM queries on every update
     */
    findPreservableLinks() {
        const links = document.querySelectorAll('a[data-preserve-filters]');
        return Array.from(links);
    }
    
    /**
     * Build query string from current filters/search
     * Matches the logic from Twig buildQueryString function
     */
    buildQueryString(filters, search, category = null) {
        const params = new URLSearchParams();
        
        // Add category if provided (from link's existing href)
        if (category) {
            params.set('category', category);
        }
        
        // Add filters
        if (filters.hasContributed !== null) {
            const urlHasContributed = filters.hasContributed === true ? 'contributor' : 'mine';
            params.set('hasContributed', urlHasContributed);
        }
        
        if (filters.gameState !== 'all') {
            params.set('gameState', filters.gameState);
        }
        
        if (filters.bookmarked !== null) {
            const urlBookmarked = filters.bookmarked === true ? 'bookmarked' : 'not_bookmarked';
            params.set('bookmarked', urlBookmarked);
        }
        
        // Add search
        if (search) {
            params.set('search', search);
        }
        
        return params.toString();
    }
    
    /**
     * Update a single link's href with current filters/search
     */
    updateLink(link) {
        const currentHref = link.getAttribute('href');
        if (!currentHref) return;
        
        try {
            // Parse the current href
            const url = new URL(currentHref, window.location.origin);
            
            // Extract category from data attribute or existing URL
            const category = link.dataset.category || url.searchParams.get('category');
            
            // Get current filters and search
            const filters = this.dataManager.getFilters();
            const search = this.dataManager.getSearch();
            
            // Build new query string with category + filters + search
            const queryString = this.buildQueryString(filters, search, category);
            
            // Update href - keep pathname, replace query string
            const newHref = url.pathname + (queryString ? '?' + queryString : '');
            link.setAttribute('href', newHref);
        } catch (e) {
            console.error('LinkFilterPreserver: Error updating link', link, e);
        }
    }
    
    /**
     * Update all cached links
     */
    updateAllLinks() {
        this.cachedLinks.forEach(link => {
            // Verify link still exists in DOM (in case of dynamic updates)
            if (document.contains(link)) {
                this.updateLink(link);
            }
        });
    }
    
    /**
     * Handle a single link being added dynamically
     * Adds it to cache and updates it with current filters/search
     */
    handleLinkAdded(link) {
        if (!link || !link.hasAttribute('data-preserve-filters')) {
            return;
        }
        
        // Add to cache if not already present
        if (!this.cachedLinks.includes(link)) {
            this.cachedLinks.push(link);
            console.log('LinkFilterPreserver: Added new link to cache');
        }
        
        // Update the link immediately with current filters/search
        this.updateLink(link);
    }
    
    /**
     * Handle multiple links being added dynamically
     * Adds them to cache and updates them with current filters/search
     */
    handleLinksAdded(links) {
        if (!Array.isArray(links) || links.length === 0) {
            return;
        }
        
        let addedCount = 0;
        links.forEach(link => {
            if (link && link.hasAttribute('data-preserve-filters')) {
                // Add to cache if not already present
                if (!this.cachedLinks.includes(link)) {
                    this.cachedLinks.push(link);
                    addedCount++;
                }
                
                // Update the link immediately with current filters/search
                this.updateLink(link);
            }
        });
        
        if (addedCount > 0) {
            console.log(`LinkFilterPreserver: Added ${addedCount} new links to cache`);
        }
    }
}

