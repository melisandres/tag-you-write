/**
 * HamburgerMenuManager - Handles the mobile hamburger menu functionality
 * Manages opening/closing the menu and handling the overlay
 */
export class HamburgerMenuManager {
    constructor() {
        this.isOpen = false;
        this.hamburgerButton = null;
        this.mobileMenu = null;
        this.closeButton = null;
        this.overlay = null;
        
        this.init();
    }

    /**
     * Initialize the hamburger menu manager
     */
    init() {
        this.hamburgerButton = document.querySelector('.nav-link.hamburger');
        this.mobileMenu = document.querySelector('.mobile-menu');
        this.closeButton = document.querySelector('.mobile-menu-close');
        this.overlay = document.querySelector('.mobile-menu-overlay');

        if (!this.hamburgerButton) {
            console.warn('HamburgerMenuManager: Hamburger button not found');
            return;
        }

        if (!this.mobileMenu) {
            console.warn('HamburgerMenuManager: Mobile menu not found');
            return;
        }

        this.bindEvents();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Hamburger button click
        this.hamburgerButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMenu();
        });

        // Close button click
        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeMenu();
            });
        }

        // Overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeMenu();
            });
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });

        // Close menu when clicking on menu links
        const menuLinks = this.mobileMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu();
            });
        });
    }

    /**
     * Toggle the mobile menu
     */
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    /**
     * Open the mobile menu
     */
    openMenu() {
        this.isOpen = true;
        this.mobileMenu.classList.add('active');
        if (this.overlay) {
            this.overlay.classList.add('active');
        }
        document.body.classList.add('menu-open');
        
        // Update hamburger button icon
        this.updateHamburgerIcon();
    }

    /**
     * Close the mobile menu
     */
    closeMenu() {
        this.isOpen = false;
        this.mobileMenu.classList.remove('active');
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        document.body.classList.remove('menu-open');
        
        // Update hamburger button icon
        this.updateHamburgerIcon();
    }

    /**
     * Update the hamburger button icon based on menu state
     */
    updateHamburgerIcon() {
        const icon = this.hamburgerButton.querySelector('.icon');
        if (icon) {
            if (this.isOpen) {
                icon.setAttribute('data-svg', 'close');
                icon.setAttribute('title', 'Close menu');
            } else {
                icon.setAttribute('data-svg', 'hamburger');
                icon.setAttribute('title', 'Open menu');
            }
            
            // Reload the SVG after changing the data-svg attribute
            this.reloadSVG(icon);
        }
    }

    /**
     * Reload SVG for a specific element
     */
    reloadSVG(element) {
        const svgType = element.getAttribute('data-svg');
        if (window.SVGManager && window.SVGManager[svgType + 'SVG']) {
            element.innerHTML = window.SVGManager[svgType + 'SVG'];
        } else if (window.uiManager && window.uiManager.populateSvgs) {
            // Fallback to UIManager method
            window.uiManager.populateSvgs([element]);
        }
    }

    /**
     * Check if menu is currently open
     * @returns {boolean}
     */
    isMenuOpen() {
        return this.isOpen;
    }
}
