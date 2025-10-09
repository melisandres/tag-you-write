import { eventBus } from './eventBus.js';

export class TutorialSwitcherManager {
    constructor() {
        this.tutorialSwitchers = document.querySelectorAll('.tutorial-switcher');
        this.tutorialModal = null;
        this.initTutorialSwitcher();
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
            });
        } else {
            this.tutorialModal.showTutorial(tutorialType);
        }
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
} 