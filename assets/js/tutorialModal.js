import { eventBus } from './eventBus.js';

export class TutorialModal {
    // ============================================================================
    // 1. CORE LIFECYCLE & INITIALIZATION
    // ============================================================================
    
    constructor(modalElement) {
        this.modalElement = modalElement;
        this.currentTutorial = null;
        this.currentStep = 0;
        this.currentSubstep = 0;
        this.visitedSubsteps = new Set(); // Track visited substeps across all tutorials
        this.formValidationState = { canPublish: false }; // Track form validation state
        this.tutorialSuccess = false; // Track if tutorial has been completed successfully
        
        // Track modal and shelf state for tutorial context
        this.uiState = {
            modalOpen: false,
            modalTextId: null,
            openShelfNodes: new Set(), // Track multiple open shelf nodes
            openShelfCount: 0
        };
        
        // Cache frequently used DOM elements to reduce repeated queries
        this.elements = {
            closeButton: modalElement.querySelector('.close-tutorial-modal'),
            title: modalElement.querySelector('.tutorial-title'),
            stepName: modalElement.querySelector('.tutorial-step-name'),
            explanation: modalElement.querySelector('.tutorial-explanation'),
            dots: modalElement.querySelector('.tutorial-dots'),
            steps: modalElement.querySelector('.tutorial-steps'),
            prevButton: modalElement.querySelector('.tutorial-arrow.prev'),
            nextButton: modalElement.querySelector('.tutorial-arrow.next')
        };
        
        // Cache context evaluation to reduce redundant getCurrentContext() calls
        this.context = null;
        this.contextValid = false;
        
        // Shared step definitions to avoid duplication
        this.sharedSteps = {
            login: {
                title: 'tutorial.shared_steps.login.title',
                skipStep: 'userLoggedIn',
                substeps: [
                    {
                        text: 'tutorial.shared_steps.login.substeps.navigation',
                        showWhen: 'page !== "login" && page !== "writer-create"',
                    },
                    {
                        text: 'tutorial.shared_steps.login.substeps.credentials',
                        showWhen: 'page === "login" || page === "writer-create"',
                    }
                ]
            }
        };
        
        this.tutorials = {
            'start-game': {
                title: 'tutorial.start-game.title',
                completion: {
                    triggerEvent: 'publishSuccess'
                },
                steps: [
                    this.sharedSteps.login, // Use shared login step
                    {
                        title: 'tutorial.start-game.steps.find.title',
                        skipStep: 'userLoggedIn && page === "create"', // Skip if logged in and on create page or if tutorial is completed
                        substeps: [
                            {
                                text: 'tutorial.start-game.steps.find.substeps.symbol',
                                showWhen: 'page === "home" && userLoggedIn', // Only show when...
                            }
                        ]
                    },
                    {
                        title: 'tutorial.start-game.steps.write.title',
                        skipStep: 'page !== "create"', // Skip if not on create page or if tutorial is completed
                        substeps: [
                            {
                                text: 'tutorial.start-game.steps.write.substeps.create',
                                showWhen: 'page === "create" && !canPublish', // Only show when form is not valid for publishing
                                                             
                            },
                            {
                                text: 'tutorial.start-game.steps.write.substeps.publish',
                                showWhen: 'page === "create" && canPublish', // Only show when form is valid for publishing
                            }
                        ]
                    },
                    {
                        title: 'tutorial.start-game.steps.success.title',
                        skipStep: '!success', // Only show when tutorial is completed
                        substeps: [
                            {
                                text: 'tutorial.start-game.steps.success.substeps.congratulations',
                                showWhen: 'success'
                            }
                        ]
                    }
                ]
            },
            'contribute': {
                title: 'tutorial.contribute.title',
                completion: {
                    triggerEvent: 'publishSuccess'
                },
                steps: [
                    this.sharedSteps.login, // Use shared login step
                    {
                        title: 'tutorial.contribute.steps.browse.title',
                        skipStep: 'page === "iterate" || page === "edit" || ((page === "texts" && category === "canJoin") || (page === "collab" && category === "canJoin")) && userLoggedIn && showcaseVisible',
                        substeps: [
                            {
                                text: 'tutorial.contribute.steps.browse.substeps.dashboard',
                                showWhen: 'page !== "dashboard" && category !== "canJoin" && userLoggedIn'
                            },
                            {
                                text: 'tutorial.contribute.steps.browse.substeps.explore',
                                showWhen: 'page === "dashboard" && userLoggedIn'
                            },
                            {
                                text: 'tutorial.contribute.steps.browse.substeps.view',
                                showWhen: '((page === "texts" && category === "canJoin") || (page === "collab" && category === "canJoin")) && userLoggedIn && !showcaseVisible'
                            }
                        ]
                    },
                    {
                        title: 'tutorial.contribute.steps.choose.title',
                        skipStep: 'page === "iterate" || page === "edit"',
                        substeps: [
                            {
                                text: 'tutorial.contribute.steps.choose.substeps.explore',
                                showWhen: '((page === "texts" && category === "canJoin") || (page === "collab" && category === "canJoin")) && userLoggedIn && showcaseVisible && (!modalOpen && !hasOpenShelf)'
                            },
                            {
                                text: 'tutorial.contribute.steps.choose.substeps.iterate',
                                showWhen: '((page === "texts" && category === "canJoin") || (page === "collab" && category === "canJoin")) && userLoggedIn && (modalOpen || hasOpenShelf)'
                            }
                        ]
                    },
                    {
                        title: 'tutorial.contribute.steps.contribute.title',
                        skipStep: '', // Skip if tutorial is completed
                        substeps: [
                            {
                                text: 'tutorial.contribute.steps.contribute.substeps.write',
                                showWhen: 'page === "iterate" || page === "edit" && !canPublish',
                            },
                            {
                                text: 'tutorial.contribute.steps.contribute.substeps.publish',
                                showWhen: 'page === "iterate" || page === "edit" && canPublish', // Only show when form is valid for publishing
                            }
                        ]
                    },
                    {
                        title: 'tutorial.contribute.steps.success.title',
                        skipStep: '!success', // Only show when tutorial is completed
                        substeps: [
                            {
                                text: 'tutorial.contribute.steps.success.substeps.congratulations',
                                showWhen: 'success'
                            }
                        ]
                    }
                ]
            },
            'vote': {
                title: 'tutorial.vote.title',
                completion: {
                    triggerEvent: 'voteToggle'
                },
                steps: [
                    this.sharedSteps.login, // Use shared login step
                    {
                        title: 'tutorial.vote.steps.browse.title',
                        skipStep: '((page === "texts" && category === "myGames") || (page === "collab" && category === "myGames")) && showcaseVisible',
                        substeps: [
                            {
                                text: 'tutorial.vote.steps.browse.substeps.dashboard',
                                showWhen: 'page !== "dashboard" && category !== "myGames" && userLoggedIn'
                            },
                            {
                                text: 'tutorial.vote.steps.browse.substeps.active',
                                showWhen: 'page === "dashboard" && userLoggedIn'
                            },
                            {
                                text: 'tutorial.vote.steps.browse.substeps.view',
                                showWhen: '((page === "texts" && category === "myGames") || (page === "collab" && category === "myGames")) && userLoggedIn && !showcaseVisible'
                            }
                        ]
                    },
                    {
                        title: 'tutorial.vote.steps.vote.title',
                        skipStep: '', // Skip if tutorial is completed
                        substeps: [
                            {
                                text: 'tutorial.vote.steps.vote.substeps.explore',
                                showWhen: '((page === "texts" && category === "myGames") || (page === "collab" && category === "myGames")) && userLoggedIn && showcaseVisible && (!modalOpen && !hasOpenShelf)'
                            },
                            {
                                text: 'tutorial.vote.steps.vote.substeps.vote_action',
                                showWhen: '((page === "texts" && category === "myGames") || (page === "collab" && category === "myGames")) && userLoggedIn && (modalOpen || hasOpenShelf)'
                            }
                        ]
                    },
                    {
                        title: 'tutorial.vote.steps.success.title',
                        skipStep: '!success', // Only show when tutorial is completed
                        substeps: [
                            {
                                text: 'tutorial.vote.steps.success.substeps.congratulations',
                                showWhen: 'success'
                            }
                        ]
                    },
                ]
            }
        };
        
        // Check for active tutorial on load
        this.checkForActiveTutorial();
        
        // Listen for page changes
        this.addPageChangeListener();
        
        // Bind close button event
        this.bindCloseEvent();
        
        // Listen for window resize to adjust margin
        this.addResizeListener();

        // Set up form field focus tracking if on create page
        // this.setupFormFocusTracking();
        
        // Listen for form validation changes
        this.setupValidationListener();
        this.setupUIStateListeners();
    }

    setupValidationListener() {
        console.log('TutorialModal: Setting up validation listener');
        // Listen for validation changes from the validation system
        eventBus.on('validationChanged', (validationStatus) => {
            this.handleValidationChange(validationStatus);
        });
    }
    
    setupUIStateListeners() {
        console.log('TutorialModal: Setting up UI state listeners');
        
        // Track modal open/close events
        eventBus.on('modalOpened', (textId) => {
            this.uiState.modalOpen = true;
            this.uiState.modalTextId = textId;
            this.invalidateContext();
            this.updateTutorialForContext();
        });
        
        eventBus.on('modalClosed', () => {
            this.uiState.modalOpen = false;
            this.uiState.modalTextId = null;
            this.invalidateContext();
            this.updateTutorialForContext();
        });
        
        // Track shelf node open/close events
        eventBus.on('shelfNodeOpened', (textId) => {
            this.uiState.openShelfNodes.add(textId);
            this.uiState.openShelfCount = this.uiState.openShelfNodes.size;
            this.invalidateContext();
            this.updateTutorialForContext();
        });
        
        eventBus.on('shelfNodeClosed', (textId) => {
            this.uiState.openShelfNodes.delete(textId);
            this.uiState.openShelfCount = this.uiState.openShelfNodes.size;
            this.invalidateContext();
            this.updateTutorialForContext();
        });
        
        // Track showcase changes (shelf to tree, or showcase closed)
        eventBus.on('showcaseChanged', (rootStoryId) => {
            // Reset shelf state when showcase changes
            this.uiState.openShelfNodes.clear();
            this.uiState.openShelfCount = 0;
            this.invalidateContext();
            this.updateTutorialForContext();
        });
        
        eventBus.on('showcaseTypeChanged', ({ type, rootStoryId }) => {
            // Reset shelf state when showcase type changes (shelf to tree, etc.)
            this.uiState.openShelfNodes.clear();
            this.uiState.openShelfCount = 0;
            this.invalidateContext();
            this.updateTutorialForContext();
        });
        
        // Check for pending tutorial completion after page load
        this.checkPendingTutorialCompletion();
        
        // Listen for tutorial completion events
        eventBus.on('voteToggle', (data) => {
            console.log('🎯 TUTORIAL: Vote toggle event received!', data);
            this.handleTutorialCompletion('voteToggle', data);
        });
        
        // Listen for publish success events
        eventBus.on('publishSuccess', (data) => {
            console.log('🎯 TUTORIAL: Publish success event received!', data);
            this.handleTutorialCompletion('publishSuccess', data);
        });
    }

    addPageChangeListener() {
        // Listen for navigation events
        window.addEventListener('popstate', () => {
            console.log('popstate event detected, updating tutorial context');
            this.invalidateContext();
            setTimeout(() => this.updateTutorialForContext(), 100);
        });

        // Monitor URL changes
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                console.log('URL change detected, updating tutorial context');
                currentUrl = window.location.href;
                this.invalidateContext();
                setTimeout(() => this.updateTutorialForContext(), 100);
            }
        }, 500);
    }

    addResizeListener() {
        window.addEventListener('resize', () => {
            if (!this.modalElement.classList.contains('display-none')) {
                this.addPageMargin();
            }
        });
    }

    bindCloseEvent() {
        const closeButton = this.elements.closeButton;
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideTutorial();
            });
        }
    }

    // ============================================================================
    // 2. TUTORIAL DISPLAY & MANAGEMENT
    // ============================================================================

    showTutorial(tutorialType) {
        if (!this.tutorials[tutorialType]) {
            console.error('Tutorial not found:', tutorialType);
            return;
        }

        // Check for pending tutorial completion first (in case user just completed an action)
        this.checkPendingTutorialCompletion();
        
        // Only reset completion state if we're starting a completely new tutorial (not just checking completion)
        if (this.currentTutorial !== tutorialType) {
            this.tutorialSuccess = false;
        }

        this.currentTutorial = tutorialType;
        const tutorial = this.tutorials[tutorialType];
        
        // Set validation state BEFORE getting context
        if (window.refreshManager && window.refreshManager.getFormValidity()) {
            const storedValidityState = window.refreshManager.getFormValidity();
            this.formValidationState.canPublish = storedValidityState.canPublish;
            console.log('TutorialModal: Set validation state before context evaluation', storedValidityState);
        } else if (window.validationManager) {
            const currentValidationState = window.validationManager.getCurrentValidationState();
            this.formValidationState.canPublish = currentValidationState.canPublish;
            console.log('TutorialModal: Set validation state from ValidationManager before context evaluation', currentValidationState);
        }
        
        const context = this.getCachedContext();
        
        // Only find new step if we don't already have one set
        if (this.currentStep === 0 && this.currentSubstep === 0) {
            // Find the first step that should NOT be skipped
            let foundStep = false;
            for (let i = 0; i < tutorial.steps.length; i++) {
                const step = tutorial.steps[i];
                if (!this.evaluateSkipStep(step.skipStep, context)) {
                    this.currentStep = i;
                    this.currentSubstep = 0;
                    foundStep = true;
                    break;
                }
            }
            
            if (!foundStep) {
                console.log('All steps should be skipped for current context');
            return;
            }
        }
        
        // Validation state was already set before context evaluation
        
        const step = tutorial.steps[this.currentStep];
        
        // Find the first available substep for current context
        let availableSubstepIndex = 0;
        for (let i = 0; i < step.substeps.length; i++) {
            if (this.evaluateShowWhen(step.substeps[i].showWhen, context)) {
                availableSubstepIndex = i;
                break;
            }
        }
        
        // Update the current substep to the available one
        this.currentSubstep = availableSubstepIndex;
        
        // Mark this substep as visited (general logic)
        this.markSubstepAsVisited(this.currentStep, availableSubstepIndex);
        
        // Update content
        const titleElement = this.elements.title;
        const stepNameElement = this.elements.stepName;
        const explanationElement = this.elements.explanation;
        
        // Update titles with translations and data-i18n attributes
        const titleTranslation = window.i18n ? window.i18n.translate(tutorial.title) : tutorial.title;
        const stepTranslation = window.i18n ? window.i18n.translate(step.title) : step.title;
        
        titleElement.setAttribute('data-i18n', tutorial.title);
        titleElement.textContent = titleTranslation;
        
        stepNameElement.setAttribute('data-i18n', step.title);
        stepNameElement.textContent = `: ${stepTranslation}`;
        
        // Update content with current substep using data-i18n pattern
        const textKey = step.substeps[availableSubstepIndex].text;
        this.setTranslatedContent(explanationElement, textKey);
        
        // Update all navigation elements
        this.updateAllNavigation();
        
        // Save tutorial state
        this.saveTutorialState();
        
        // Show the modal
        this.modalElement.classList.remove('display-none');
        
        // Bind navigation button events
        this.bindNavigationEvents();
        
        // Add margin to page content
        setTimeout(() => this.addPageMargin(), 10); // Small delay to ensure modal is rendered
    }
    

    hideTutorial() {
        this.modalElement.classList.add('display-none');
        this.removePageMargin();
        this.tutorialSuccess = false; // Reset success state when closing tutorial
        this.stopContextChecking = false; // Reset context checking flag
        this.clearTutorialState();
        
        // Clean up any old localStorage data (backward compatibility)
        localStorage.removeItem('pendingTutorialCompletion');
        
        // Emit event to clear tutorial active states
        eventBus.emit('tutorialClosed');
        
        console.log('Tutorial hidden');
    }


    updateTutorialForContext() {
        console.log('🎯 TUTORIAL: updateTutorialForContext called, currentTutorial:', this.currentTutorial);
        if (!this.currentTutorial) {
            console.log('🎯 TUTORIAL: No active tutorial, skipping context update');
            return;
        }
        
        // Don't update context if tutorial is completed
        if (this.stopContextChecking) {
            console.log('🎯 TUTORIAL: Tutorial completed, skipping context update');
            return;
        }
        
        const tutorial = this.tutorials[this.currentTutorial];
        const context = this.getCachedContext();
        console.log('🎯 TUTORIAL: Context in updateTutorialForContext:', context);
        console.log('🎯 TUTORIAL: Current step/substep:', this.currentStep, this.currentSubstep);
        console.log('About to evaluate steps, tutorial.steps.length:', tutorial.steps.length);
        
        // Find the appropriate step based on success state
        let foundStep = false;
        
        // If tutorial is completed (success = true), go to the last step (success step)
        if (context.success) {
            const lastStepIndex = tutorial.steps.length - 1;
            const lastStep = tutorial.steps[lastStepIndex];
            const shouldSkipLast = this.evaluateSkipStep(lastStep.skipStep, context);
            if (!shouldSkipLast) {
                if (lastStepIndex !== this.currentStep) {
                    this.currentStep = lastStepIndex;
                    this.currentSubstep = 0;
                }
                foundStep = true;
                
                // Stop context checking once we're on the success step
                this.stopContextChecking = true;
            }
        }
        
        // If not completed or success step is skipped, find the first valid step
        if (!foundStep) {
            try {
                for (let i = 0; i < tutorial.steps.length; i++) {
                    const step = tutorial.steps[i];
                    const shouldSkip = this.evaluateSkipStep(step.skipStep, context);
                    console.log(`Step ${i} (${step.title}): shouldSkip=${shouldSkip}, skipStep="${step.skipStep}"`);
                    
                    if (!shouldSkip) {
                        if (i !== this.currentStep) {
                            console.log(`Moving from step ${this.currentStep} to step ${i}`);
                            this.currentStep = i;
                            this.currentSubstep = 0;
                        }
                        foundStep = true;
                        break;
                    }
                }
            } catch (error) {
                console.error('Error in step evaluation:', error);
            }
        }
        
        if (!foundStep) {
            // All steps should be skipped, hide tutorial
            this.hideTutorial();
            return;
        }
        
        const step = tutorial.steps[this.currentStep];
        console.log(`Current step: ${this.currentStep} (${step.title})`);
        
        // Find the most appropriate substep for current context
        let availableSubstepIndex = 0;
        
        // Always find the best substep for the current context
            for (let i = 0; i < step.substeps.length; i++) {
                const substep = step.substeps[i];
                const isValid = this.evaluateShowWhen(substep.showWhen, context);
            console.log(`Substep ${i}: isValid=${isValid}, showWhen="${substep.showWhen}"`);
                if (isValid) {
                    availableSubstepIndex = i; // Select the first valid substep
                    break; // Stop at the first valid substep
                }
            }
        
        console.log(`Selected substep: ${availableSubstepIndex}`);
        
        // Update the current substep to the available one
        this.currentSubstep = availableSubstepIndex;
        
        // Mark this substep as visited (general logic)
        this.markSubstepAsVisited(this.currentStep, availableSubstepIndex);
        
        // Update content with current substep using data-i18n pattern
        const textKey = step.substeps[availableSubstepIndex].text;
        this.setTranslatedContent(this.elements.explanation, textKey);
        
        // Update all navigation elements
        this.updateAllNavigation();
        
        // Save state
        this.saveTutorialState();
    }


    updateTutorialDisplay() {
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        const substep = step.substeps[this.currentSubstep];
        
        // Update content
        const titleElement = this.elements.title;
        const stepNameElement = this.elements.stepName;
        const explanationElement = this.elements.explanation;
        
        // Update titles with translations and data-i18n attributes
        const titleTranslation = window.i18n ? window.i18n.translate(tutorial.title) : tutorial.title;
        const stepTranslation = window.i18n ? window.i18n.translate(step.title) : step.title;
        
        titleElement.setAttribute('data-i18n', tutorial.title);
        titleElement.textContent = titleTranslation;
        
        stepNameElement.setAttribute('data-i18n', step.title);
        stepNameElement.textContent = `: ${stepTranslation}`;
        
        // Update content with current substep using data-i18n pattern
        const textKey = substep.text;
        this.setTranslatedContent(explanationElement, textKey);
        
        // Update all navigation elements
        this.updateAllNavigation();
        
        // Save state
        this.saveTutorialState();
    }

    checkForActiveTutorial() {
        const activeTutorial = localStorage.getItem('activeTutorial');
        
        if (activeTutorial) {
            const tutorialData = JSON.parse(activeTutorial);
            
            this.currentTutorial = tutorialData.tutorialType;
            this.currentStep = tutorialData.step || 0;
            this.currentSubstep = tutorialData.substep || 0;
            
            // Restore tutorial success state from localStorage
            this.tutorialSuccess = tutorialData.tutorialSuccess || false;
            console.log('🎯 TUTORIAL: Restored tutorialSuccess from localStorage:', this.tutorialSuccess);
            
            // Handle backward compatibility with old localStorage data
            this.visitedSubsteps = new Set(tutorialData.visitedSubsteps || []);
            
            // Don't call showTutorial here - it will override the saved state
            // Instead, just show the modal with the current state
            this.showTutorialWithCurrentState();
        } else {
            console.log('❌ No active tutorial found in localStorage');
        }
    }

    showTutorialWithCurrentState() {
        if (!this.currentTutorial) return;
        
        // Use the main update logic to ensure consistency
        this.updateTutorialForContext();
        
        // Show the modal
        this.modalElement.classList.remove('display-none');
        
        // Add margin to page content
        setTimeout(() => this.addPageMargin(), 10); // Small delay to ensure modal is rendered
    }


    // ============================================================================
    // 3. NAVIGATION & USER INTERACTION
    // ============================================================================


    bindNavigationEvents() {
        const prevButton = this.elements.prevButton;
        const nextButton = this.elements.nextButton;
        
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.navigatePrevious();
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                this.navigateNext();
            });
        }
        
        // Update button states
        this.updateNavigationButtons();
    }


    navigatePrevious() {
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        
        // Try to go to previous substep first
        if (this.currentSubstep > 0) {
            this.goToSubstep(this.currentSubstep - 1, true); // true = manual navigation
            return;
        }
        
        // If at first substep, try to go to previous step
        if (this.currentStep > 0) {
            // For manual navigation, go to the last substep of the previous step
            // regardless of context validity
            const prevStep = tutorial.steps[this.currentStep - 1];
            this.currentStep = this.currentStep - 1;
            this.currentSubstep = prevStep.substeps.length - 1;
            this.updateTutorialDisplay();
        }
    }


    navigateNext() {
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        
        // Try to go to next substep first
        if (this.currentSubstep < step.substeps.length - 1) {
            this.goToSubstep(this.currentSubstep + 1, true); // true = manual navigation
            return;
        }
        
        // If at last substep, try to go to next step
        if (this.currentStep < tutorial.steps.length - 1) {
            // For manual navigation, go to the first substep of the next step
            // regardless of context validity
            const nextStep = tutorial.steps[this.currentStep + 1];
            this.currentStep = this.currentStep + 1;
            this.currentSubstep = 0;
            this.updateTutorialDisplay();
        }
    }


    goToStep(stepIndex) {
        const tutorial = this.tutorials[this.currentTutorial];
        
        // For manual navigation, allow going to any step without context checking
        // Context conditions are only used for automatic tutorial progression
        if (stepIndex >= 0 && stepIndex < tutorial.steps.length) {
            this.navigateToStep(stepIndex);
        }
    }

    navigateToStep(stepIndex) {
        const tutorial = this.tutorials[this.currentTutorial];
        
        if (stepIndex >= 0 && stepIndex < tutorial.steps.length) {
            this.currentStep = stepIndex;
            this.currentSubstep = 0;
            
            // Update content with translations and data-i18n attributes
            const stepNameElement = this.elements.stepName;
            const explanationElement = this.elements.explanation;
            
            const step = tutorial.steps[this.currentStep];
            const stepTranslation = window.i18n ? window.i18n.translate(step.title) : step.title;
            stepNameElement.setAttribute('data-i18n', step.title);
            stepNameElement.textContent = `: ${stepTranslation}`;
            
            const availableSubsteps = this.getAvailableSubsteps(step);
            const firstSubstep = step.substeps[0];
            const textKey = firstSubstep.text;
            this.setTranslatedContent(explanationElement, textKey);
            
            // Update all navigation elements
            this.updateAllNavigation();
            
            // Save state
            this.saveTutorialState();
        }
    }


    goToSubstep(substepIndex, isManualNavigation = false) {
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        const context = this.getCachedContext();
        
        // Check if the requested substep should be shown
        const substep = step.substeps[substepIndex];
        if (!substep) {
            console.log(`Substep ${substepIndex} does not exist`);
            return;
        }
        
        // For automatic navigation, check context validity
        if (!isManualNavigation && !this.evaluateShowWhen(substep.showWhen, context)) {
            console.log(`Cannot navigate to substep ${substepIndex} - not available for current context`);
            return;
        }
        
        if (substepIndex >= 0 && substepIndex < step.substeps.length) {
            this.currentSubstep = substepIndex;
            
            // Mark this substep as visited (general logic, not just for forms)
            this.markSubstepAsVisited(this.currentStep, substepIndex);
            
            // Update content using data-i18n pattern
            const textKey = substep.text;
            this.setTranslatedContent(this.elements.explanation, textKey);
            
            // Update all navigation elements
            this.updateAllNavigation();
        
        // Save state
        this.saveTutorialState();
        }
    }
       
    // ============================================================================
    // 4. NAVIGATION UI ELEMENTS
    // ============================================================================

    createNavigationDots(substeps, currentSubstepIndex = 0) {
        const dotsContainer = this.elements.dots;
        if (!dotsContainer) {
            console.error('Dots container not found');
            return;
        }

        // Clear existing dots
        dotsContainer.innerHTML = '';

        // Get current step and context for substep styling (cache context)
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        const context = this.getCachedContext();
        
        // Hide dots container if on the success step
        const isSuccessStep = context.success && this.currentStep === tutorial.steps.length - 1;
        if (isSuccessStep) {
            dotsContainer.classList.add('display-none');
            return;
        }
        
        // Show dots container for regular steps
        dotsContainer.classList.remove('display-none');

        // Create dots for ALL substeps with proper states
        step.substeps.forEach((substep, index) => {
            const dot = document.createElement('div');
            dot.className = 'tutorial-dot';
            
            // Check if this substep should be shown based on showWhen condition
            const shouldShow = this.evaluateShowWhen(substep.showWhen, context);
            
            // Check if this substep has been visited
            const isVisited = this.visitedSubsteps.has(`${this.currentStep}-${index}`);
            
            // Set dot state based on current substep, showWhen condition, and visited status
            if (index === currentSubstepIndex) {
                // Active takes priority over visited
                dot.classList.add('active');
            } else if (isVisited) {
                dot.classList.add('visited');
            } else {
                dot.classList.add('disabled');
            }
            
            // Add conditional styling if substep doesn't apply to current context
            if (!shouldShow) {
                dot.classList.add('conditional-hidden');
            }
            
            // Add click event to navigate to this substep (only if it should be shown)
            dot.addEventListener('click', () => {
                if (shouldShow && (index <= currentSubstepIndex || index === currentSubstepIndex + 1)) {
                    this.goToSubstep(index);
                }
            });
            
            dotsContainer.appendChild(dot);
        });
    }

    createStepNavigation() {
        const stepsContainer = this.elements.steps;
        if (!stepsContainer) {
            console.error('Steps container not found');
            return;
        }

        // Clear existing steps
        stepsContainer.innerHTML = '';

        const tutorial = this.tutorials[this.currentTutorial];
        const context = this.getCachedContext();

        // Create step elements for each step
        tutorial.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'tutorial-step';
            
            // Add data-i18n attribute and translate the step title
            const stepTranslation = window.i18n ? window.i18n.translate(step.title) : step.title;
            stepElement.setAttribute('data-i18n', step.title);
            stepElement.textContent = stepTranslation;
            
            // Determine step state
            const shouldSkip = this.evaluateSkipStep(step.skipStep, context);
            const isSuccessStep = context.success && this.currentStep === tutorial.steps.length - 1;
            const isSuccessBreadcrumb = index === tutorial.steps.length - 1; // "Success!" step
            
            // State 1: Regular tutorial steps - hide only the success breadcrumb
            if (!isSuccessStep && isSuccessBreadcrumb) {
                stepElement.classList.add('display-none');
            }
            
            // State 2: Success step - hide all breadcrumbs except the success one
            if (isSuccessStep && !isSuccessBreadcrumb) {
                stepElement.classList.add('display-none');
            }
            
            if (index < this.currentStep) {
                stepElement.classList.add('visited');
            } else if (index === this.currentStep) {
                stepElement.classList.add('active');
            } else {
                stepElement.classList.add('disabled');
            }
            
            // Add conditional styling if step should be skipped
            if (shouldSkip) {
                stepElement.classList.add('conditional-hidden');
            }
            
            // Add click event to navigate to this step
            // Allow clicking on any step for free exploration
            stepElement.addEventListener('click', () => {
                    this.goToStep(index);
            });
            
            stepsContainer.appendChild(stepElement);
        });
    }


    updateNavigationButtons() {
        const prevButton = this.elements.prevButton;
        const nextButton = this.elements.nextButton;
        
        if (!prevButton || !nextButton) return;
        
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        const context = this.getCachedContext();
        
        // Hide navigation buttons if on the success step
        const isSuccessStep = context.success && this.currentStep === tutorial.steps.length - 1;
        
        if (isSuccessStep) {
            prevButton.classList.add('display-none');
            nextButton.classList.add('display-none');
            return;
        }
        
        // Show navigation buttons for regular steps
        prevButton.classList.remove('display-none');
        nextButton.classList.remove('display-none');
        
        // For manual navigation, be more permissive
        // Previous navigation: allow if not at the very beginning
        const canGoBack = this.currentSubstep > 0 || this.currentStep > 0;
        prevButton.disabled = !canGoBack;
        
        // Next navigation: allow if not at the very end
        const canGoForward = this.currentSubstep < step.substeps.length - 1 || 
                             this.currentStep < tutorial.steps.length - 1;
        nextButton.disabled = !canGoForward;
    }

    /**
     * Consolidated method to update all navigation elements
     * Reduces duplication across multiple methods
     */
    updateAllNavigation() {
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        
        // Update step navigation
        this.createStepNavigation();
        
        // Update navigation dots
        this.createNavigationDots(step.substeps.map(s => s.text), this.currentSubstep);
        
        // Update navigation buttons
        this.updateNavigationButtons();
    }

    // ============================================================================
    // 5. CONTEXT & STATE MANAGEMENT
    // ============================================================================

    getCurrentContext() {
        // Detect current page
        const path = window.location.pathname;
        console.log('getCurrentContext called, path:', path);
        let page = 'home';
        
        if (path.includes('/text/create') || this.isCreatePage()) {
            page = 'create';
        } else if (path.includes('/text/iterate')) {
            page = 'iterate';
        } else if (path.includes('/text/edit')) {
            page = 'edit';
        } else if (path.includes('/collab')) {
            page = 'collab';
        } else if (path.includes('/text')) {
            page = 'texts';
        } else if (path.includes('/dashboard')) {
            page = 'dashboard';
        } else if (path.includes('/login')) {
            page = 'login';
        } else if (path.includes('/contribute')) {
            page = 'contribute';
        } else if (path.includes('/writer/create')) {
            page = 'writer-create';
        }

        // Detect user login status
        const userMeta = document.querySelector('meta[name="user"]');
        const userLoggedIn = userMeta && userMeta.dataset.userId !== 'null';

        // Detect URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const showcase = urlParams.get('showcase'); // 'tree', 'shelf', or null
        const gameId = urlParams.get('gameId'); // Current game ID if viewing a specific game
        
        // Showcase is visible if the URL parameter exists (any value: tree, shelf, or default)
        const showcaseVisible = showcase !== null;

        // Get unified category - from URL for texts pages, from dataManager for collab pages
        const category = this.getUnifiedCategory(page);

        console.log('category', category);

        return { 
            page, 
            userLoggedIn,
            canPublish: this.formValidationState.canPublish,
            showcase: showcase, // 'tree', 'shelf', or null
            showcaseVisible: showcaseVisible, // Whether showcase is actually visible in DOM
            category: category, // 'canJoin', 'myGames', 'other', or null
            gameId: gameId, // Current game ID if viewing a specific game
            modalOpen: this.uiState.modalOpen, // Whether a story modal is open
            modalTextId: this.uiState.modalTextId, // ID of the open modal's text
            openShelfCount: this.uiState.openShelfCount, // Number of open shelf nodes
            hasOpenShelf: this.uiState.openShelfCount > 0, // Whether any shelf nodes are open
            success: this.tutorialSuccess // Whether tutorial has been completed successfully
        };
    }

    /**
     * Get current context with caching
     * Returns cached context if valid, otherwise evaluates and caches
     */
    getCachedContext() {
        if (!this.contextValid) {
            this.context = this.getCurrentContext();
            this.contextValid = true;
        }
        return this.context;
    }

    /**
     * Invalidate context cache when context changes
     */
    invalidateContext() {
        this.contextValid = false;
        this.context = null;
    }

    getUnifiedCategory(page) {
        // For texts pages, get category from URL parameter
        if (page === 'texts') {
            const urlParams = new URLSearchParams(window.location.search);
            let category = urlParams.get('category');
            category = category ? (category.split('.')[0]): null;
            return category;
        }
        
        // For collab pages, get category from dataManager
        if (page === 'collab') {
            // Extract game ID from URL (e.g., /collab/558 -> 558)
            const path = window.location.pathname;
            const collabMatch = path.match(/\/collab\/(\d+)/);
            if (!collabMatch) {
                return null;
            }
            
            const rootTextId = collabMatch[1];
            
            // Get game data from dataManager
            if (window.dataManager && window.dataManager.cache.games) {
                // cache.games is a Map, so we need to iterate through values
                for (const [gameId, gameEntry] of window.dataManager.cache.games) {
                    const gameData = gameEntry.data;
                    if (gameData.text_id == rootTextId) {
                        if (gameData.category) {
                            // Split category at "." and return first part
                            return gameData.category.split('.')[0];
                        }
                    }
                }
            }
        }
        
        return null;
    }



    isCreatePage() {
        // Check if we're on a create page (either /text/create or /text/edit with root text)
        const path = window.location.pathname;

        // Direct create page
        if (path.includes('/text/create')) {
            return true;
        }
        
        if (path.includes('/text/edit')) {
            // Check if this is a root text (new game being created)
            const parentIdInput = document.querySelector('input[name="parent_id"]');
            if (parentIdInput && parentIdInput.value === '') {
                // Empty parent_id means this is a root text for a new game
                return true;
            }
        }
        
        return false;
    }


    getAvailableSubsteps(step) {
        // Return all substeps (we'll handle visibility through dot states)
        return step.substeps.map(substep => substep.text);
    }


    // ============================================================================
    // 6. TUTORIAL LOGIC & EVALUATION
    // ============================================================================

    evaluateSkipStep(skipStep, context) {
        if (!skipStep) return false; // No condition means don't skip
        
        return this.evaluateCondition(skipStep, context);
    }

    evaluateShowWhen(showWhen, context) {
        if (!showWhen) return true; // No condition means always show
        
        return this.evaluateCondition(showWhen, context);
    }

    evaluateCondition(condition, context) {
        if (!condition) return true;
        
        console.log('Evaluating condition:', condition, 'with context:', context);
        
        try {
            // Create a safe evaluation function
            const { page, userLoggedIn, canPublish, showcase, showcaseVisible, category, gameId, modalOpen, modalTextId, openShelfCount, hasOpenShelf, success } = context;
            
            // Replace the condition string with actual values
            let expression = condition
                .replace(/page/g, `"${page}"`)
                .replace(/userLoggedIn/g, userLoggedIn)
                .replace(/canPublish/g, canPublish)
                .replace(/showcaseVisible/g, showcaseVisible) // Replace showcaseVisible BEFORE showcase
                .replace(/showcase/g, showcase ? `"${showcase}"` : 'null')
                .replace(/category/g, category ? `"${category}"` : 'null')
                .replace(/gameId/g, gameId ? `"${gameId}"` : 'null')
                .replace(/modalOpen/g, modalOpen)
                .replace(/modalTextId/g, modalTextId ? `"${modalTextId}"` : 'null')
                .replace(/openShelfCount/g, openShelfCount)
                .replace(/hasOpenShelf/g, hasOpenShelf)
                .replace(/success/g, success);
            
            console.log('Evaluated expression:', expression);
            
            // Use Function constructor for safe evaluation
            const result = new Function('return ' + expression)();
            console.log('Condition result:', result);
            
            return Boolean(result);
        } catch (error) {
            console.error('Error evaluating condition:', condition, error);
            return false;
        }
    }

    markSubstepAsVisited(stepIndex, substepIndex) {
        this.visitedSubsteps.add(`${stepIndex}-${substepIndex}`);
        this.saveTutorialState();
    }

    // ============================================================================
    // 7. EVENT HANDLERS & COMPLETION
    // ============================================================================

    handleValidationChange(validationStatus) {
        console.log('TutorialModal: Received validationChanged event', validationStatus);
        
        // Only update if there's an actual change in canPublish status
        if (this.formValidationState.canPublish !== validationStatus.canPublish) {
            this.formValidationState.canPublish = validationStatus.canPublish;
            console.log('formValidationState', this.formValidationState);
            console.log('currentTutorial', this.currentTutorial);
            
            // Update tutorial context if we're currently showing a tutorial
            if (this.currentTutorial) {
                console.log('updating tutorial for context');
                // Invalidate context cache to ensure fresh validation state
                this.invalidateContext();
                this.updateTutorialForContext();
            }
        } else {
            console.log('TutorialModal: No change in canPublish status, skipping update');
        }
    }


    handleTutorialCompletion(eventType, data) {
        console.log('🎯 TUTORIAL: Handling completion for', eventType, 'in tutorial', this.currentTutorial);
        
        if (!this.currentTutorial) {
            console.log('🎯 TUTORIAL: No current tutorial, skipping completion');
            return;
        }
        
        const tutorial = this.tutorials[this.currentTutorial];
        if (!tutorial || !tutorial.completion) {
            console.log('🎯 TUTORIAL: No completion config for tutorial', this.currentTutorial);
            return;
        }
        
        console.log('🎯 TUTORIAL: Tutorial completion config:', tutorial.completion);
        console.log('🎯 TUTORIAL: Expected trigger event:', tutorial.completion.triggerEvent);
        console.log('🎯 TUTORIAL: Received event type:', eventType);
        
        // For publishSuccess events, check if the action matches the current tutorial
        if (eventType === 'publishSuccess') {
            const action = this.determineTutorialAction(data);
            if (action && tutorial.completion.triggerEvent === action) {
                console.log('🎯 TUTORIAL: Tutorial completed! Setting success state');
                this.tutorialSuccess = true;
                console.log('🎯 TUTORIAL: tutorialSuccess set to:', this.tutorialSuccess);
                this.invalidateContext();
                this.updateTutorialForContext();
            } else {
                console.log('🎯 TUTORIAL: Publish action does not match current tutorial');
            }
        } else if (tutorial.completion.triggerEvent === eventType) {
            // For other events (like voteToggle), use direct matching
            console.log('🎯 TUTORIAL: Tutorial completed! Setting success state');
            this.tutorialSuccess = true;
            console.log('🎯 TUTORIAL: tutorialSuccess set to:', this.tutorialSuccess);
            this.invalidateContext();
            this.updateTutorialForContext();
        } else {
            console.log('🎯 TUTORIAL: Event type does not match expected trigger');
        }
    }

    
    checkPendingTutorialCompletion() {
        // This method is now deprecated since we use event-driven approach
        // Keeping for backward compatibility but it's no longer needed
        console.log('🎯 TUTORIAL: checkPendingTutorialCompletion called - now using event-driven approach');
        
        // Clean up any old localStorage data
        localStorage.removeItem('pendingTutorialCompletion');
    }
    

    determineTutorialAction(completionData) {
        const { action } = completionData;
        
        // Check if this matches the current tutorial's expected action
        if (!this.currentTutorial) return null;
        
        const tutorial = this.tutorials[this.currentTutorial];
        if (!tutorial || !tutorial.completion) return null;
        
        // Map form types to tutorial actions
        if (this.currentTutorial === 'start-game' && action === 'root') {
            return 'publishSuccess';
        }
        if (this.currentTutorial === 'contribute' && action === 'iteration') {
            return 'publishSuccess';
        }
        
        return null;
    }
    
    handleFieldFocus(field) {
        const fieldName = field.name;
        
        // Show the corresponding tutorial substep
        this.showSubstepForField(fieldName);
    }

    showSubstepForField(fieldName) {
        if (!this.currentTutorial) return;
        
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        
        // Find substep with matching field
        step.substeps.forEach((substep, index) => {
            if (substep.field === fieldName) {
                this.goToSubstep(index);
            }
        });
    }

    /*     setupFormFocusTracking() {
        // Only set up form tracking on create pages
        if (!this.isCreatePage()) return;
        
        // Track form field focus
        const form = document.getElementById('main-form');
        if (!form) return;
        
        // Listen for field focus
        form.addEventListener('focusin', (e) => {
            this.handleFieldFocus(e.target);
        });
    }

 */

    /*
     * FIELD-SPECIFIC TUTORIAL IMPLEMENTATION GUIDE:
     * 
     * To implement field-specific tutorial guidance, add a 'field' property to your substeps:
     * 
     * Example in this.tutorials:
     * {
     *   'contribute': {
     *     steps: [
     *       {
     *         title: 'tutorial.contribute.steps.contribute.title',
     *         substeps: [
     *           {
     *             text: 'tutorial.contribute.steps.contribute.substeps.title_help',
     *             field: 'title',  // ← This links to the title input field
     *             showWhen: 'page === "create" && !canPublish'
     *           },
     *           {
     *             text: 'tutorial.contribute.steps.contribute.substeps.writing_help', 
     *             field: 'writing', // ← This links to the writing textarea
     *             showWhen: 'page === "create" && !canPublish'
     *           }
     *         ]
     *       }
     *     ]
     *   }
     * }
     * 
     * When a user focuses on a form field, the tutorial will automatically
     * jump to the substep that explains that specific field.
     */
    

    // ============================================================================
    // 8. STATE PERSISTENCE
    // ============================================================================

    saveTutorialState() {
        if (this.currentTutorial) {
            const tutorialState = {
                tutorialType: this.currentTutorial,
                step: this.currentStep,
                substep: this.currentSubstep,
                visitedSubsteps: Array.from(this.visitedSubsteps),
                tutorialSuccess: this.tutorialSuccess
            };
            
            localStorage.setItem('activeTutorial', JSON.stringify(tutorialState));
        }
    }

    clearTutorialState() {
        localStorage.removeItem('activeTutorial');
        this.currentTutorial = null;
        this.currentStep = 0;
        this.currentSubstep = 0;
        this.visitedSubsteps.clear();
        this.tutorialSuccess = false;
    }


     // ============================================================================
    // 9. UI UTILITIES
    // ============================================================================
    

    addPageMargin() {
        // Set CSS custom property for dynamic tutorial height
        const tutorialHeight = this.modalElement.offsetHeight || 120; // Default height if not yet rendered
        document.documentElement.style.setProperty('--tutorial-height', `${tutorialHeight}px`);
        
        // Add CSS class to body - this pushes the entire page up so footer is visible above tutorial
        document.body.classList.add('tutorial-active');
    }

    removePageMargin() {
        // Remove CSS class from body
        document.body.classList.remove('tutorial-active');
    }

    // ============================================================================
    // 10. CONTENT & TRANSLATION HELPERS
    // ============================================================================

    /**
     * Inject SVGs into tutorial content
     */
    
    injectSVGsInTutorial() {
        if (!window.SVGManager) {
            console.error('TutorialModal: SVGManager not available');
            return;
        }

        const svgElements = this.modalElement.querySelectorAll('[data-svg]');
        svgElements.forEach(element => {
            const svgType = element.getAttribute('data-svg');
            if (SVGManager[svgType + 'SVG']) {
                element.innerHTML = SVGManager[svgType + 'SVG'];
            } else {
                console.error(`TutorialModal: SVG ${svgType} not found`);
            }
        });
    }

    /**
     * Helper method to inject SVGs into a specific element
     * Handles both localization system and fallback SVG injection
     */
    injectSVGsInElement(element) {
        if (window.i18n && window.i18n.updateSVGsInTranslatedContent) {
            window.i18n.updateSVGsInTranslatedContent(element);
        } else {
            this.injectSVGsInTutorial();
        }
    }

    /**
     * Helper method to set translated content with SVG injection
     * Combines translation and SVG injection in one step
     */
    setTranslatedContent(element, textKey) {
        const translation = window.i18n ? window.i18n.translate(textKey) : textKey;
        element.innerHTML = `<span data-i18n="${textKey}">${translation}</span>`;
        this.injectSVGsInElement(element);
    }

}