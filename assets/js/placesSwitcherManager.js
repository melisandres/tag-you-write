import { eventBus } from './eventBus.js';

/**
 * PlacesSwitcherManager
 * Manages the places switcher dropdown that contains navigation links (home, dashboard, gamelist)
 */
export class PlacesSwitcherManager {
    constructor() {
        this.placesSwitchers = document.querySelectorAll('.places-switcher');
        
        if (this.placesSwitchers.length > 0) {
            this.initPlacesSwitcher();
        }
    }

    initPlacesSwitcher() {
        this.placesSwitchers.forEach(switcher => {
            const currentPlacesElement = switcher.querySelector('.current-places');
            const placesLinks = switcher.querySelectorAll('.places-dropdown a');
            
            // Toggle dropdown when clicking the current places icon
            if (currentPlacesElement) {
                currentPlacesElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Emit event to close all other dropdowns before opening this one
                    eventBus.emit('dropdownOpening', { element: switcher });
                    
                    switcher.classList.toggle('open');
                });
            }
            
            // Handle clicks on dropdown links
            // Since these are navigation links, we just close the dropdown and let the browser navigate
            placesLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    // Don't prevent default - let the browser handle navigation
                    // Just close the dropdown
                    switcher.classList.remove('open');
                });
            });
        });
        
        // Close dropdowns when clicking outside (single listener for all switchers)
        if (this.placesSwitchers.length > 0) {
            document.addEventListener('click', (e) => {
                this.placesSwitchers.forEach(switcher => {
                    if (!switcher.contains(e.target)) {
                        switcher.classList.remove('open');
                    }
                });
            });
        }
    }
}
