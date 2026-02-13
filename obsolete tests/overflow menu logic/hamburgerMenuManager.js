/**
 * HamburgerMenuManager - Handles the overflow menu functionality
 * Manages opening/closing the menu and handling the overlay
 */
export class HamburgerMenuManager {
    constructor() {
        this.isOpen = false;
        this.hamburgerButton = null;
        this.overflowMenu = null;
        this.closeButton = null;
        this.overlay = null;
        
        this.init();
    }

    /**
     * Initialize the hamburger menu manager
     */
    init() {
        this.hamburgerButton = document.querySelector('.nav-link.hamburger');
        this.overflowMenu = document.querySelector('.overflow-menu');
        this.closeButton = document.querySelector('.overflow-menu-close');
        this.overlay = document.querySelector('.overflow-menu-overlay');

        if (!this.hamburgerButton) {
            console.warn('HamburgerMenuManager: Hamburger button not found');
            return;
        }

        if (!this.overflowMenu) {
            console.warn('HamburgerMenuManager: Overflow menu not found');
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
        const menuLinks = this.overflowMenu.querySelectorAll('a');
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
        console.log('HamburgerMenuManager: Toggle menu called, isOpen:', this.isOpen);
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
        console.log('HamburgerMenuManager: Opening menu');
        this.isOpen = true;
        this.overflowMenu.classList.add('active');
        if (this.overlay) {
            this.overlay.classList.add('active');
        }
        document.body.classList.add('overflow-menu-open');
        console.log('HamburgerMenuManager: Menu opened, overflow menu classes:', this.overflowMenu.className);
    }

    /**
     * Close the overflow menu
     */
    closeMenu() {
        this.isOpen = false;
        this.overflowMenu.classList.remove('active');
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        document.body.classList.remove('overflow-menu-open');
    }


    /**
     * Check if menu is currently open
     * @returns {boolean}
     */
    isMenuOpen() {
        return this.isOpen;
    }
}
