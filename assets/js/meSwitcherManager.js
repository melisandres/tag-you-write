import { eventBus } from './eventBus.js';

/**
 * MeSwitcherManager
 * Manages the me switcher dropdown that contains language selection and logout
 */
export class MeSwitcherManager {
    constructor() {
        this.meSwitchers = document.querySelectorAll('.me-switcher');
        
        if (this.meSwitchers.length > 0) {
            this.initMeSwitcher();
            this.setupLanguageChangeListener();
        }
    }

    initMeSwitcher() {
        this.meSwitchers.forEach(switcher => {
            const currentMeElement = switcher.querySelector('.current-me');
            const languageLinks = switcher.querySelectorAll('.me-dropdown a[data-language]');
            const logoutLink = switcher.querySelector('.me-dropdown a[href*="logout"]');
            
            // Toggle dropdown when clicking the current me icon
            if (currentMeElement) {
                currentMeElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Emit event to close all other dropdowns before opening this one
                    eventBus.emit('dropdownOpening', { element: switcher });
                    
                    switcher.classList.toggle('open');
                });
            }
            
            // Handle clicks on language links - use same pattern as language-switcher
            // The Localization class handles language switching, we just need to call it
            languageLinks.forEach(link => {
                const lang = link.getAttribute('data-language');
                
                // Update active state initially
                this.updateLanguageActiveState(link, lang);
                
                // Add click event listener - same pattern as language-switcher
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Use the localization system to switch language
                    // window.i18n is the Localization instance (set in main.js)
                    if (window.i18n && typeof window.i18n.switchLanguage === 'function') {
                        window.i18n.switchLanguage(lang);
                    }
                    
                    // Close the dropdown
                    switcher.classList.remove('open');
                });
            });
            
            // Handle logout link - let browser navigate normally
            if (logoutLink) {
                logoutLink.addEventListener('click', () => {
                    // Close dropdown before navigating
                    switcher.classList.remove('open');
                });
            }
        });
        
        // Close dropdowns when clicking outside (single listener for all switchers)
        if (this.meSwitchers.length > 0) {
            document.addEventListener('click', (e) => {
                this.meSwitchers.forEach(switcher => {
                    if (!switcher.contains(e.target)) {
                        switcher.classList.remove('open');
                    }
                });
            });
        }
    }

    /**
     * Update active state for a language link
     */
    updateLanguageActiveState(link, lang) {
        if (window.i18n && window.i18n.currentLanguage === lang) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    }

    /**
     * Setup listener for language changes to update active states
     */
    setupLanguageChangeListener() {
        // Listen for language change events to update active states
        eventBus.on('languageChanged', (data) => {
            this.meSwitchers.forEach(switcher => {
                const languageLinks = switcher.querySelectorAll('.me-dropdown a[data-language]');
                languageLinks.forEach(link => {
                    const lang = link.getAttribute('data-language');
                    this.updateLanguageActiveState(link, lang);
                });
            });
        });
    }
}
