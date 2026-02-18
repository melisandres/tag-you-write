import { eventBus } from './eventBus.js';

export class TutorialSwitcherManager {
    constructor() {
        this.tutorialSwitchers = document.querySelectorAll('.tutorial-switcher');
        this.tutorialModal = null;
        this.initTutorialSwitcher();
        
        // Set up validation listener immediately so we can track form state
        this.setupValidationListener();
    }

    initTutorialSwitcher() {
        if (this.tutorialSwitchers.length === 0) return;
        
        this.tutorialSwitchers.forEach(switcher => {
            const currentTutorialElement = switcher.querySelector('.current-tutorial');
            const tutorialLinks = switcher.querySelectorAll('.tutorial-dropdown a[data-tutorial]');
            
            // Toggle dropdown when clicking the current tutorial
            if (currentTutorialElement) {
                currentTutorialElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Emit event to close all other dropdowns before opening this one
                    eventBus.emit('dropdownOpening', { element: switcher });
                    
                    switcher.classList.toggle('open');
                });
            }
            
            // Add click event listeners to tutorial links
            tutorialLinks.forEach(link => {
                const tutorialType = link.getAttribute('data-tutorial');
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.startTutorial(tutorialType);
                    switcher.classList.remove('open');
                });
            });
        });
            
        // Close dropdowns when clicking outside (single listener for all switchers)
        if (this.tutorialSwitchers.length > 0) {
            document.addEventListener('click', (e) => {
                this.tutorialSwitchers.forEach(switcher => {
                    if (!switcher.contains(e.target)) {
                switcher.classList.remove('open');
                    }
                });
            });
        }
        
        // Handle submenu tutorial links (overflow menu)
        const submenuTutorialLinks = document.querySelectorAll('.submenu-content.tutorial-submenu a[data-tutorial]');
        submenuTutorialLinks.forEach(link => {
            const tutorialType = link.getAttribute('data-tutorial');
            
            // Add click event listener
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startTutorial(tutorialType);
            });
        });

        // Handle standalone tutorial links (e.g. home index "start here" button)
        document.querySelectorAll('a[data-tutorial]').forEach(link => {
            if (link.closest('.tutorial-dropdown') || link.closest('.submenu-content.tutorial-submenu')) return;
            const tutorialType = link.getAttribute('data-tutorial');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.startTutorial(tutorialType);
            });
        });
        
        // Update active states for all tutorial links
        this.updateTutorialActiveStates();

        // Listen for overflow menu tutorial selection events
        document.addEventListener('submenu:tutorial:selected', (e) => {
            console.log('TutorialSwitcherManager: Received submenu tutorial selection:', e.detail.tutorial);
            this.startTutorial(e.detail.tutorial);
        });
        
        // Listen for tutorial closed events
        eventBus.on('tutorialClosed', () => {
            this.clearTutorialActiveStates();
            this.updateNavLink();
        });

        // if there is an active tutorial in local storage, then load the tutorial modal
        // Note: TutorialModal constructor will automatically restore from localStorage via checkForActiveTutorial()
        // So we just need to initialize it, not call showTutorial again
        if (localStorage.getItem('activeTutorial')) {
            this.initTutorialModal().then(() => {
                // TutorialModal constructor already handled restoration, just update nav link
                this.updateNavLink();
            });
        } else {
            // Update nav-link state on initial load (in case modal is visible from previous session)
            this.updateNavLink();
        }
    }

    startTutorial(tutorialType) {
        if (!this.tutorialModal) {
            this.initTutorialModal().then(() => {
                this.tutorialModal.showTutorial(tutorialType);
                this.updateTutorialActiveStates();
                this.updateNavLink();
            });
        } else {
            this.tutorialModal.showTutorial(tutorialType);
            this.updateTutorialActiveStates();
            this.updateNavLink();
        }
    }

    setupValidationListener() {
        console.log('TutorialSwitcherManager: Setting up validation listener');
        // Listen for validation changes and pass them to the tutorial modal if it exists
        eventBus.on('validationChanged', (validationStatus) => {
            console.log('TutorialSwitcherManager: Received validationChanged event', validationStatus);
            
            // Only pass validation for page forms (not modal forms like contact)
            // Tutorials are for page forms, not contact forms
            if (validationStatus.formType && validationStatus.formType === 'contact') {
                console.log('TutorialSwitcherManager: Ignoring contact form validation');
                return;
            }
            
            if (this.tutorialModal) {
                // Pass the validation event to the tutorial modal
                this.tutorialModal.handleValidationChange(validationStatus);
            }
        });
    }
    

    initTutorialModal() {
        let modalElement = document.querySelector('.tutorial-modal-background');
        if (!modalElement) {
            modalElement = this.createTutorialModalElement();
        }
        
        return import('./tutorialModal.js').then(module => {
            const { TutorialModal } = module;
            this.tutorialModal = new TutorialModal(modalElement);
        });
    }

    createTutorialModalElement() {
        const modalElement = document.createElement('div');
        modalElement.className = 'tutorial-modal-background display-none';
        modalElement.innerHTML = `
            <div class="tutorial-modal">
                <div class="tutorial-modal-content">
                    <div class="tutorial-header">
                        <div class="tutorial-title-container">
                            <span class="tutorial-title"></span>
                            <span class="tutorial-step-name"></span>
                        </div>
                        <button class="close-tutorial-modal">×</button>
                    </div>
                    <div class="tutorial-step-navigation">
                        <div class="tutorial-steps"></div>
                    </div>
                    <div class="tutorial-body">
                        <div class="tutorial-explanation"></div>
                    </div>
                    <div class="tutorial-navigation">
                        <button class="tutorial-arrow prev" disabled>‹</button>
                        <div class="tutorial-dots"></div>
                        <button class="tutorial-arrow next">›</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalElement);
        return modalElement;
    }
    
    /**
     * Update active states for all tutorial links (main nav and overflow menu)
     */
    updateTutorialActiveStates() {
        // Get current active tutorial from localStorage
        const activeTutorial = localStorage.getItem('activeTutorial');
        let currentTutorialType = null;
        
        if (activeTutorial) {
            try {
                const tutorialData = JSON.parse(activeTutorial);
                currentTutorialType = tutorialData.tutorialType;
            } catch (e) {
                console.warn('Failed to parse activeTutorial from localStorage:', e);
            }
        }
        
        // Update main nav tutorial links
        const mainNavTutorialLinks = document.querySelectorAll('.tutorial-dropdown a[data-tutorial]');
        mainNavTutorialLinks.forEach(link => {
            const linkTutorialType = link.getAttribute('data-tutorial');
            
            if (linkTutorialType === currentTutorialType) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Update overflow menu tutorial links
        const submenuTutorialLinks = document.querySelectorAll('.submenu-content.tutorial-submenu a[data-tutorial]');
        submenuTutorialLinks.forEach(link => {
            const linkTutorialType = link.getAttribute('data-tutorial');
            
            if (linkTutorialType === currentTutorialType) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    /**
     * Clear active states for all tutorial links (main nav and overflow menu)
     */
    clearTutorialActiveStates() {
        // Clear main nav tutorial links
        const mainNavTutorialLinks = document.querySelectorAll('.tutorial-dropdown a[data-tutorial]');
        mainNavTutorialLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Clear overflow menu tutorial links
        const submenuTutorialLinks = document.querySelectorAll('.submenu-content.tutorial-submenu a[data-tutorial]');
        submenuTutorialLinks.forEach(link => {
            link.classList.remove('active');
        });
    }

    /**
     * Update the tutorial nav-link to show active state when tutorial is visible
     * Similar to notificationsMenuManager.updateNavLink()
     */
    updateNavLink() {
        // Get the tutorial modal element
        const tutorialModal = document.querySelector('.tutorial-modal-background');
        if (!tutorialModal) {
            // If modal doesn't exist, ensure nav-link is not active
            this.tutorialSwitchers.forEach(switcher => {
                switcher.classList.remove('active');
            });
            return;
        }

        // Check if tutorial modal is visible (not hidden with display-none)
        const hasActiveTutorial = !tutorialModal.classList.contains('display-none');
        
        // Update all tutorial switcher nav-links
        this.tutorialSwitchers.forEach(switcher => {
            switcher.classList.toggle('active', hasActiveTutorial);
        });
    }
} 