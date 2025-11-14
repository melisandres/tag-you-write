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
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                switcher.classList.remove('open');
            });
        });
        
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
        });

        // if there is an active tutorial in local storage, then load the tutorial modal
        if (localStorage.getItem('activeTutorial')) {
            this.initTutorialModal().then(() => {
                const activeTutorial = localStorage.getItem('activeTutorial');
                const tutorialData = JSON.parse(activeTutorial);
                this.tutorialModal.showTutorial(tutorialData.tutorialType);
            });
        }
    }

    startTutorial(tutorialType) {
        if (!this.tutorialModal) {
            this.initTutorialModal().then(() => {
                this.tutorialModal.showTutorial(tutorialType);
                this.updateTutorialActiveStates();
            });
        } else {
            this.tutorialModal.showTutorial(tutorialType);
            this.updateTutorialActiveStates();
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
} 