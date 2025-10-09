import { eventBus } from './eventBus.js';

export class TutorialModal {
    constructor(modalElement) {
        this.modalElement = modalElement;
        this.currentTutorial = null;
        this.currentStep = 0;
        this.tutorials = {
            'start-game': {
                title: 'How to Start a Game',
                steps: [
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNsaWNrIHRoZSArIHN5bWJvbDwvdGV4dD48L3N2Zz4=',
                        explanation: 'Log in or sign up',
                        tips: ['An account is required to create a game']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNsaWNrIHRoZSArIHN5bWJvbDwvdGV4dD48L3N2Zz4=',
                        explanation: 'Click the + symbol in the navigation to create a new collaboration',
                        tips: ['This opens the game creation form']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZpbGwgb3V0IHRoZSBmb3JtPC90ZXh0Pjwvc3ZnPg==',
                        explanation: 'Fill out each section of the form',
                        tips: [
                            'Title: Will be the title of the final piece',
                            'Prompt: Guidelines for next writers',
                            'Starting Text: What collaborators will transform',
                            'Keywords: Important words for the story',
                            'Privacy: Who can join and see this game'
                        ]
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNhdmUgb3IgcHVibGlzaDwvdGV4dD48L3N2Zz4=',
                        explanation: 'Choose to save for later, publish to start the game, or delete',
                        tips: ['You can always come back to edit later']
                    }
                ]
            },
            'contribute': {
                title: 'How to Contribute to a Game',
                steps: [
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNsaWNrIHRoZSArIHN5bWJvbDwvdGV4dD48L3N2Zz4=',
                        explanation: 'Log in or sign up',
                        tips: ['An account is required to contribute to a game']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlZpZXcgdGhlIGdhbWUgdHJlZTwvdGV4dD48L3N2Zz4=',
                        explanation: 'View the game tree and read the nodes to understand the story',
                        tips: ['Each node represents a contribution to the story']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNob29zZSBhIG5vZGU8L3RleHQ+PC9zdmc+',
                        explanation: 'Choose the node you want to iterate on',
                        tips: ['Look for nodes that inspire you or need development']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNsaWNrIHRoZSBpdGVyYXRlIGJ1dHRvbjwvdGV4dD48L3N2Zz4=',
                        explanation: 'Click the writing hand icon to start iterating',
                        tips: ['This opens the contribution form']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZpbGwgb3V0IHRoZSBjb250cmlidXRpb248L3RleHQ+PC9zdmc+',
                        explanation: 'Fill out the contribution form',
                        tips: [
                            '3-word description: Use action verbs like "added", "removed", "accentuated"',
                            'Text: Make your changes to the story',
                            'Keywords: A word you felt was important'
                        ]
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlB1Ymxpc2ggeW91ciBjb250cmlidXRpb248L3RleHQ+PC9zdmc+',
                        explanation: 'Publish your contribution or save for later',
                        tips: ['Your contribution will appear as a new node in the tree']
                    }
                ]
            },
            'vote': {
                title: 'How to Vote on Text Nodes',
                steps: [
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvZ2luIG9yIHNpZ24gdXA8L3RleHQ+PC9zdmc+',
                        explanation: 'Log in or sign up',
                        tips: ['An account is required to vote on a game']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlZpZXcgdGhlIGdhbWU8L3RleHQ+PC9zdmc+',
                        explanation: 'View the game tree or shelf to see all contributions',
                        tips: ['You can vote on any published node']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNsaWNrIG9uIGEgbm9kZTwvdGV4dD48L3N2Zz4=',
                        explanation: 'Click on a node to view its content',
                        tips: ['Read the full text before voting']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNsaWNrIHRoZSB2b3RlIGJ1dHRvbjwvdGV4dD48L3N2Zz4=',
                        explanation: 'Click the heart paddle vote icon to vote',
                        tips: ['Click again to unvote if you change your mind']
                    },
                    {
                        gif: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlRoZSB3aW5uZXIgaXMgc2VsZWN0ZWQ8L3RleHQ+PC9zdmc+',
                        explanation: 'The node with the most votes becomes the final text',
                        tips: ['Voting helps determine the best direction for the story']
                    }
                ]
            }
        };
        
        this.bindEvents();
    }

    showTutorial(tutorialType) {
        if (!this.tutorials[tutorialType]) {
            console.error('Tutorial not found:', tutorialType);
            return;
        }

        this.currentTutorial = tutorialType;
        this.currentStep = 0;
        
        this.modalElement.classList.remove('display-none');
        this.updateTutorialContent();
        
        // Emit tutorial modal opened event
        eventBus.emit('tutorialModalOpened', { tutorialType });
    }

    updateTutorialContent() {
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        
        // Update title
        const titleElement = this.modalElement.querySelector('.tutorial-title');
        titleElement.textContent = tutorial.title;
        
        // Update GIF
        const gifElement = this.modalElement.querySelector('.tutorial-gif');
        gifElement.src = step.gif;
        
        // Update explanation
        const explanationElement = this.modalElement.querySelector('.tutorial-explanation');
        explanationElement.textContent = step.explanation;
        
        // Update tips
        const tipsElement = this.modalElement.querySelector('.tutorial-tips');
        tipsElement.innerHTML = step.tips.map(tip => `<li>${tip}</li>`).join('');
        
        // Update navigation
        this.updateNavigation();
    }

    updateNavigation() {
        const tutorial = this.tutorials[this.currentTutorial];
        const prevButton = this.modalElement.querySelector('.tutorial-prev');
        const nextButton = this.modalElement.querySelector('.tutorial-next');
        const currentStepElement = this.modalElement.querySelector('.tutorial-current-step');
        const totalStepsElement = this.modalElement.querySelector('.tutorial-total-steps');
        
        // Update step numbers
        currentStepElement.textContent = this.currentStep + 1;
        totalStepsElement.textContent = tutorial.steps.length;
        
        // Update button states
        prevButton.disabled = this.currentStep === 0;
        nextButton.textContent = this.currentStep === tutorial.steps.length - 1 ? 'Finish' : 'Next';
    }

    nextStep() {
        const tutorial = this.tutorials[this.currentTutorial];
        
        if (this.currentStep < tutorial.steps.length - 1) {
            this.currentStep++;
            this.updateTutorialContent();
        } else {
            this.hideModal();
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateTutorialContent();
        }
    }

    hideModal() {
        this.modalElement.classList.add('display-none');
        this.currentTutorial = null;
        this.currentStep = 0;
        
        // Emit tutorial modal closed event
        eventBus.emit('tutorialModalClosed');
    }

    bindEvents() {
        // Close button
        const closeButton = this.modalElement.querySelector('.close-tutorial-modal');
        closeButton.addEventListener('click', () => this.hideModal());
        
        // Navigation buttons
        const prevButton = this.modalElement.querySelector('.tutorial-prev');
        const nextButton = this.modalElement.querySelector('.tutorial-next');
        
        prevButton.addEventListener('click', () => this.prevStep());
        nextButton.addEventListener('click', () => this.nextStep());
        
        // Close on outside click
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.hideModal();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.modalElement.classList.contains('display-none')) {
                if (e.key === 'Escape') {
                    this.hideModal();
                } else if (e.key === 'ArrowRight') {
                    this.nextStep();
                } else if (e.key === 'ArrowLeft') {
                    this.prevStep();
                }
            }
        });
    }
}