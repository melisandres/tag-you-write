/**
 * AboutManager - Handles the about modal functionality
 * Maintains separation of concerns for site information display
 */
export class AboutManager {
    constructor() {
        this.aboutModal = null;
        this.isOpen = false;
        this.init();
    }

    /**
     * Initialize the about manager
     */
    init() {
        this.createAboutModal();
        this.bindEvents();
    }

    /**
     * Create the about modal HTML structure
     */
    createAboutModal() {
        // Create modal background
        const modalBackground = document.createElement('div');
        modalBackground.className = 'about-modal-background display-none';
        modalBackground.setAttribute('data-about-modal', 'hidden');

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'about-modal-content';

        modalContent.innerHTML = `
            <div class="about-modal-header">
                <button class="about-modal-close" aria-label="Close about modal">
                    <span class="icon" data-svg="close"></span>
                </button>
            </div>
            <div class="about-modal-body">
                <div class="about-content">
                    <h1 class="about-title" data-i18n="about.title">About Tag You Write</h1>
                    <p class="about-description" data-i18n="about.description" data-i18n-html="true">A collaborative writing platform where creativity meets community.</p>
                    
                    <div class="about-creator">
                        <div class="about-creator-image">
                            <img src="" alt="Mélisandre, creator of Tag You Write" class="creator-photo">
                        </div>
                        <div class="about-creator-info">
                            <p class="creator-text" data-i18n="about.creator.bio">Created by Mélisandre, a developer who believes in the power of collaborative storytelling.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modalBackground.appendChild(modalContent);
        document.body.appendChild(modalBackground);
        
        this.aboutModal = modalBackground;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button events
        const closeButtons = this.aboutModal.querySelectorAll('.about-modal-close, .about-modal-close-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });

        // Background click to close
        this.aboutModal.addEventListener('click', (e) => {
            if (e.target === this.aboutModal) {
                this.closeModal();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal();
            }
        });

        // About button event listeners - handle smooth scrolling to anchor
        document.addEventListener('click', (e) => {
            const aboutLink = e.target.closest('.overflow-menu .nav-link.about, .footer-about-btn');
            
            if (aboutLink && aboutLink.href) {
                const url = new URL(aboutLink.href);
                const isHomePage = window.location.pathname === url.pathname || 
                                  window.location.pathname === url.pathname + '/' ||
                                  url.pathname === '/' || url.pathname === '';
                
                // If we're on the home page and link has #about anchor, scroll smoothly
                if (isHomePage && url.hash === '#about') {
                    e.preventDefault();
                    const aboutSection = document.getElementById('about');
                    if (aboutSection) {
                        aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                // Otherwise, let the browser handle navigation normally
            }
        });
        
        // Handle initial page load with #about anchor
        if (window.location.hash === '#about') {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const aboutSection = document.getElementById('about');
                    if (aboutSection) {
                        aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            });
        }
    }

    /**
     * Show the about modal
     */
    showModal() {
        if (!this.aboutModal) {
            console.error('AboutManager: Modal not found');
            return;
        }

        this.aboutModal.classList.remove('display-none');
        this.aboutModal.setAttribute('data-about-modal', 'visible');
        this.isOpen = true;
        
        // Prevent body scroll
        document.body.classList.add('about-modal-open');
        
        // Set image path
        this.setImagePath();
        
        // Populate SVGs
        this.populateSVGs();
        
        // Update translations
        this.updateTranslations();
        
        console.log('AboutManager: Modal opened');
    }

    /**
     * Close the about modal
     */
    closeModal() {
        if (!this.aboutModal || !this.isOpen) return;

        this.aboutModal.classList.add('display-none');
        this.aboutModal.setAttribute('data-about-modal', 'hidden');
        this.isOpen = false;
        
        // Restore body scroll
        document.body.classList.remove('about-modal-open');
        
        console.log('AboutManager: Modal closed');
    }

    /**
     * Set the correct image path using the base URL
     */
    setImagePath() {
        const baseUrlElement = document.querySelector('[data-base-url]');
        if (baseUrlElement) {
            const baseUrl = baseUrlElement.getAttribute('data-base-url');
            const img = this.aboutModal.querySelector('.creator-photo');
            if (img) {
                img.src = baseUrl + 'assets/imgs/melisandre.JPG';
            }
        } else {
            console.error('AboutManager: Base URL not found');
        }
    }

    /**
     * Populate SVG icons in the modal
     */
    populateSVGs() {
        if (!window.SVGManager) {
            console.error('AboutManager: SVGManager not available');
            return;
        }

        const svgElements = this.aboutModal.querySelectorAll('[data-svg]');
        svgElements.forEach(element => {
            const svgType = element.getAttribute('data-svg');
            if (SVGManager[svgType + 'SVG']) {
                element.innerHTML = SVGManager[svgType + 'SVG'];
            } else {
                console.error(`AboutManager: SVG ${svgType} not found`);
            }
        });
    }

    /**
     * Update translations in the modal
     */
    updateTranslations() {
        if (!window.i18n) {
            console.error('AboutManager: i18n not available');
            return;
        }

        // Use the localization system's updatePageTranslations method
        // which properly handles HTML content when data-i18n-html="true" is set
        window.i18n.updatePageTranslations(this.aboutModal);
    }

    /**
     * Toggle modal visibility
     */
    toggleModal() {
        if (this.isOpen) {
            this.closeModal();
        } else {
            this.showModal();
        }
    }

    /**
     * Check if modal is currently open
     */
    isModalOpen() {
        return this.isOpen;
    }

    /**
     * Get modal element
     */
    getModal() {
        return this.aboutModal;
    }
}
