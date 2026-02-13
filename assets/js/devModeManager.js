import { eventBus } from './eventBus.js';

/**
 * DevModeManager - Handles dev mode privilege toggle for admin users
 * Allows switching between privilege levels for testing purposes
 */
export class DevModeManager {
    constructor() {
        this.baseUrl = document.querySelector('[data-base-url]')?.dataset.baseUrl || '';
        this.init();
    }

    /**
     * Initialize the dev mode manager
     */
    init() {
        // Initialize main nav dropdown toggle (like language switcher)
        this.initMainNavToggle();

        // Listen for dev mode privilege selection events (from overflow menu)
        document.addEventListener('submenu:devMode:selected', (e) => {
            const privilegeId = parseInt(e.detail.privilege_id);
            this.togglePrivilege(privilegeId);
        });

        // Also handle direct clicks on privilege links (fallback)
        this.initDirectClickHandlers();
    }

    /**
     * Initialize main nav dropdown toggle (similar to language switcher)
     */
    initMainNavToggle() {
        const devModeToggles = document.querySelectorAll('.dev-mode-toggle');
        
        devModeToggles.forEach(toggle => {
            const currentPrivilege = toggle.querySelector('.current-privilege');
            const dropdown = toggle.querySelector('.dev-mode-dropdown');
            
            if (!currentPrivilege || !dropdown) return;

            // Toggle dropdown when clicking the current privilege
            currentPrivilege.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Emit event to close all other dropdowns before opening this one
                eventBus.emit('dropdownOpening', { element: toggle });
                
                toggle.classList.toggle('open');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!toggle.contains(e.target)) {
                    toggle.classList.remove('open');
                }
            });

            // Handle clicks on dropdown links
            const dropdownLinks = dropdown.querySelectorAll('a[data-privilege]');
            dropdownLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const privilegeId = parseInt(link.getAttribute('data-privilege'));
                    this.togglePrivilege(privilegeId);
                    toggle.classList.remove('open'); // Close dropdown after selection
                });
            });
        });
    }

    /**
     * Initialize direct click handlers for privilege links
     */
    initDirectClickHandlers() {
        const privilegeLinks = document.querySelectorAll('a[data-privilege]');
        privilegeLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Only handle if it's a dev mode privilege link
                if (link.closest('.dev-mode-dropdown, .dev-mode-submenu')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const privilegeId = parseInt(link.getAttribute('data-privilege'));
                    this.togglePrivilege(privilegeId);
                }
            });
        });
    }

    /**
     * Toggle privilege level via AJAX
     */
    async togglePrivilege(privilegeId) {
        try {
            const response = await fetch(`${this.baseUrl}user/toggleTestPrivilege`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    privilege_id: privilegeId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Failed to toggle privilege:', data.error);
                // You could show a toast notification here
                return;
            }

            if (data.success) {
                // Update active states in UI
                this.updateActiveStates(privilegeId);
                
                // Reload the page to reflect privilege changes
                // This ensures all queries and permissions are updated
                window.location.reload();
            }
        } catch (error) {
            console.error('Error toggling privilege:', error);
        }
    }

    /**
     * Update active states for privilege links and current privilege display
     */
    updateActiveStates(privilegeId) {
        // Get privilege abbreviation
        const privilegeAbbr = this.getPrivilegeAbbreviation(privilegeId);

        // Update main nav current privilege display
        const mainNavCurrent = document.querySelector('.dev-mode-toggle .current-privilege');
        if (mainNavCurrent) {
            mainNavCurrent.textContent = privilegeAbbr;
        }

        // Update main nav dropdown
        const mainNavLinks = document.querySelectorAll('.dev-mode-dropdown a[data-privilege]');
        mainNavLinks.forEach(link => {
            const linkPrivilegeId = parseInt(link.getAttribute('data-privilege'));
            if (linkPrivilegeId === privilegeId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Get abbreviation for privilege ID
     */
    getPrivilegeAbbreviation(privilegeId) {
        switch(privilegeId) {
            case 1: return 'ADM';
            case 2: return 'REG';
            case 4: return 'BETA';
            default: return 'ADM';
        }
    }
}

