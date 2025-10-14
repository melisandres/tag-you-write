import { eventBus } from './eventBus.js';

export class TutorialModal {
    constructor(modalElement) {
        this.modalElement = modalElement;
        this.currentTutorial = null;
        this.currentStep = 0;
        this.currentSubstep = 0;
        this.visitedSubsteps = new Set(); // Track visited substeps across all tutorials
        this.formValidationState = { canPublish: false }; // Track form validation state
        
        // Shared step definitions to avoid duplication
        this.sharedSteps = {
            login: {
                title: 'Log in',
                skipStep: 'userLoggedIn',
                substeps: [
                    {
                        text: 'Click the login button in the navigation',
                        showWhen: 'page !== "login" && page !== "writer-create"',
                    },
                    {
                        text: 'Enter your credentials or create a new account',
                        showWhen: 'page === "login" || page === "writer-create"',
                    }
                ]
            }
        };
        
        this.tutorials = {
            'start-game': {
                title: 'How to Start a Game',
                steps: [
                    this.sharedSteps.login, // Use shared login step
                    {
                        title: 'Create new game',
                        skipStep: 'userLoggedIn && page === "create"', // Skip if logged in and on create page
                        substeps: [
                            {
                                text: 'Click the + symbol in the navigation to create a new collaboration OR if you have an existing game that you want help to finish creating, click on the question mark in the navigation and select the "Finish creating" tutorial',
                                showWhen: 'page === "home" && userLoggedIn', // Only show when...
                            }
                        ]
                    },
                    {
                        title: 'Fill out the form',
                        skipStep: 'page !== "create"', // Skip if not on create page
                        substeps: [
                            {
                                text: 'Fill out the form. Consider using the relationship between the title, the prompt and the starting text to create tension, conflict, or to pose a question.',
                                showWhen: 'page === "create" && !canPublish', // Only show when form is not valid for publishing
                                                             
                            },
                            {
                                text: 'When ready click on "publish" to launch the game, or you can always delete the game or save what you have as a draft.',
                                showWhen: 'page === "create" && canPublish', // Only show when form is valid for publishing
                            }
                        ]
                    }
                ]
            },
            'contribute': {
                title: 'How to Contribute to a Game',
                steps: [
                    this.sharedSteps.login, // Use shared login step
                    {
                        title: 'Browse games',
                        skipStep: 'page === "iterate"',
                        substeps: [
                            {
                                text: 'View the game list to find stories you want to contribute to',
                                showWhen: 'page !== "texts" && userLoggedIn'
                            },
                            {
                                text: 'Click on any game with the "can join" icon to view its tree OR shelf view. You will be able to explore the texts contributed to this game.',
                                showWhen: 'page === "texts" && userLoggedIn'
                            }
                        ]
                    },
                    {
                        title: 'Choose a node',
                        skipStep: 'page === "iterate"',
                        substeps: [
                            {
                                text: 'Read through the story nodes to understand the narrative',
                                showWhen: 'page === "collab"'
                            },
                            {
                                text: 'Look for nodes that inspire you or need development',
                                showWhen: 'page === "collab"'
                            },
                            {
                                text: 'Click on a node to view its full content',
                                showWhen: 'page === "collab"'
                            }
                        ]
                    },
                    {
                        title: 'Start contributing',
                        skipStep: 'page !== "collab"',
                        substeps: [
                            {
                                text: 'Click the writing hand icon to start iterating',
                                showWhen: 'page === "collab"'
                            },
                            {
                                text: 'This opens the contribution form',
                                showWhen: 'page === "collab"'
                            }
                        ]
                    },
                    {
                        title: 'Fill contribution',
                        skipStep: 'page !== "contribute"',
                        substeps: [
                            {
                                text: '3-word description: Use action verbs like "added", "removed", "accentuated"',
                                showWhen: 'page === "contribute"'
                            },
                            {
                                text: 'Text: Make your changes to the story',
                                showWhen: 'page === "contribute"'
                            },
                            {
                                text: 'Keywords: A word you felt was important',
                                showWhen: 'page === "contribute"'
                            },
                            {
                                text: 'Publish your contribution or save for later',
                                showWhen: 'page === "contribute"'
                            }
                        ]
                    }
                ]
            },
            'vote': {
                title: 'How to Vote on Text Nodes',
                steps: [
                    this.sharedSteps.login, // Use shared login step
                    {
                        title: 'Browse games',
                        skipStep: 'page !== "texts" || !userLoggedIn',
                        substeps: [
                            {
                                text: 'View the game list to find stories you want to vote on',
                                showWhen: 'page === "texts" && userLoggedIn'
                            },
                            {
                                text: 'Click on any game to view its tree or shelf',
                                showWhen: 'page === "texts" && userLoggedIn'
                            }
                        ]
                    },
                    {
                        title: 'View nodes',
                        skipStep: 'page !== "collab"',
                        substeps: [
                            {
                                text: 'Browse through all the story nodes',
                                showWhen: 'page === "collab"'
                            },
                            {
                                text: 'Click on a node to view its full content',
                                showWhen: 'page === "collab"'
                            },
                            {
                                text: 'Read the text before deciding to vote',
                                showWhen: 'page === "collab"'
                            }
                        ]
                    },
                    {
                        title: 'Vote',
                        skipStep: 'page !== "collab"',
                        substeps: [
                            {
                                text: 'Click the heart paddle icon to vote on a node',
                                showWhen: 'page === "collab"'
                            },
                            {
                                text: 'Click again to unvote if you change your mind. The node with the most votes becomes the final text',
                                showWhen: 'page === "collab"'
                            }
                        ]
                    }
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
    }

    setupValidationListener() {
        // Listen for validation changes from the validation system
        eventBus.on('validationChanged', (validationStatus) => {
            this.formValidationState.canPublish = validationStatus.canPublish;
            console.log('formValidationState', this.formValidationState);
            console.log('currentTutorial', this.currentTutorial);
            
            // Update tutorial context if we're currently showing a tutorial
            if (this.currentTutorial && validationStatus.canPublish) {
                console.log('updating tutorial for context');
                this.updateTutorialForContext();
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
    } */

    addResizeListener() {
        window.addEventListener('resize', () => {
            if (!this.modalElement.classList.contains('display-none')) {
                this.addPageMargin();
            }
        });
    }

    bindCloseEvent() {
        const closeButton = this.modalElement.querySelector('.close-tutorial-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideTutorial();
            });
        }
    }

    addPageMargin() {
        // Add margin to the bottom of the page content to prevent tutorial overlap
        const body = document.body;
        const tutorialHeight = this.modalElement.offsetHeight || 120; // Default height if not yet rendered
        
        // Add margin to body
        body.style.marginBottom = `${tutorialHeight}px`;
        
        // Also add margin to main content areas if they exist
        const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.querySelector('#main');
        if (mainContent) {
            mainContent.style.marginBottom = `${tutorialHeight}px`;
        }
    }

    removePageMargin() {
        // Remove the margin we added
        const body = document.body;
        body.style.marginBottom = '';
        
        // Remove margin from main content areas
        const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.querySelector('#main');
        if (mainContent) {
            mainContent.style.marginBottom = '';
        }
    }

    addPageChangeListener() {
        // Listen for navigation events
        window.addEventListener('popstate', () => {
            setTimeout(() => this.updateTutorialForContext(), 100);
        });

        // Monitor URL changes
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(() => this.updateTutorialForContext(), 100);
            }
        }, 500);
    }

    updateTutorialForContext() {
        if (!this.currentTutorial) return;
        
        const tutorial = this.tutorials[this.currentTutorial];
        const context = this.getCurrentContext();
        
        // Find the first step that should NOT be skipped
        let foundStep = false;
        for (let i = 0; i < tutorial.steps.length; i++) {
            const step = tutorial.steps[i];
            const shouldSkip = this.evaluateSkipStep(step.skipStep, context);
            
            if (!shouldSkip) {
                if (i !== this.currentStep) {
                    this.currentStep = i;
                    this.currentSubstep = 0;
                }
                foundStep = true;
                break;
            }
        }
        
        if (!foundStep) {
            // All steps should be skipped, hide tutorial
            this.hideTutorial();
            return;
        }
        
        const step = tutorial.steps[this.currentStep];
        
        // Check if the current substep is still valid for this context
        const currentSubstep = step.substeps[this.currentSubstep];
        let availableSubstepIndex = 0;
        
        // If we just restored from localStorage, try to keep the current substep
        if (currentSubstep && this.evaluateShowWhen(currentSubstep.showWhen, context)) {
            // Keep the restored substep
            availableSubstepIndex = this.currentSubstep;
        } else {
            // Current substep is not valid, find the first available substep for current context
            for (let i = 0; i < step.substeps.length; i++) {
                const substep = step.substeps[i];
                const isValid = this.evaluateShowWhen(substep.showWhen, context);
                if (isValid) {
                    availableSubstepIndex = i;
                    break;
                }
            }
        }
        
        // Update the current substep to the available one
        this.currentSubstep = availableSubstepIndex;
        
        // Mark this substep as visited (general logic)
        this.markSubstepAsVisited(this.currentStep, availableSubstepIndex);
        
        // Update content with current substep
        const explanationElement = this.modalElement.querySelector('.tutorial-explanation');
        explanationElement.textContent = step.substeps[availableSubstepIndex].text;
        
        // Update dots
        this.createNavigationDots(step.substeps.map(s => s.text), availableSubstepIndex);
        
        // Update step navigation
        this.createStepNavigation();
        
        // Save state
        this.saveTutorialState();
    }

    showTutorial(tutorialType) {
        if (!this.tutorials[tutorialType]) {
            console.error('Tutorial not found:', tutorialType);
            return;
        }

        this.currentTutorial = tutorialType;
        const tutorial = this.tutorials[tutorialType];
        const context = this.getCurrentContext();
        
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
        const titleElement = this.modalElement.querySelector('.tutorial-title');
        const stepNameElement = this.modalElement.querySelector('.tutorial-step-name');
        const explanationElement = this.modalElement.querySelector('.tutorial-explanation');
        
        titleElement.textContent = tutorial.title;
        stepNameElement.textContent = `: ${step.title}`;
        explanationElement.textContent = step.substeps[availableSubstepIndex].text;
        
        // Create navigation dots for all substeps
        this.createNavigationDots(step.substeps.map(s => s.text), availableSubstepIndex);
        
        // Create step navigation
        this.createStepNavigation();
        
        // Save tutorial state
        this.saveTutorialState();
        
        // Show the modal
        this.modalElement.classList.remove('display-none');
        
        // Add margin to page content
        setTimeout(() => this.addPageMargin(), 10); // Small delay to ensure modal is rendered
    }

    hideTutorial() {
        this.modalElement.classList.add('display-none');
        this.removePageMargin();
        this.clearTutorialState();
        
        // Emit event to clear tutorial active states
        eventBus.emit('tutorialClosed');
        
        console.log('Tutorial hidden');
    }

    createNavigationDots(substeps, currentSubstepIndex = 0) {
        const dotsContainer = this.modalElement.querySelector('.tutorial-dots');
        if (!dotsContainer) {
            console.error('Dots container not found');
            return;
        }

        // Clear existing dots
        dotsContainer.innerHTML = '';

        // Get current step and context for substep styling (cache context)
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        const context = this.getCurrentContext();

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
        const stepsContainer = this.modalElement.querySelector('.tutorial-steps');
        if (!stepsContainer) {
            console.error('Steps container not found');
            return;
        }

        // Clear existing steps
        stepsContainer.innerHTML = '';

        const tutorial = this.tutorials[this.currentTutorial];
        const context = this.getCurrentContext();

        // Create step elements for each step
        tutorial.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'tutorial-step';
            stepElement.textContent = step.title;
            
            // Determine step state
            const shouldSkip = this.evaluateSkipStep(step.skipStep, context);
            
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
            stepElement.addEventListener('click', () => {
                if (index <= this.currentStep || index === this.currentStep + 1) {
                    this.goToStep(index);
                }
            });
            
            stepsContainer.appendChild(stepElement);
        });
    }

    goToStep(stepIndex) {
        const tutorial = this.tutorials[this.currentTutorial];
        const context = this.getCurrentContext();
        
        // Find the next available step starting from stepIndex
        for (let i = stepIndex; i < tutorial.steps.length; i++) {
            const step = tutorial.steps[i];
            if (!this.evaluateSkipStep(step.skipStep, context)) {
                // Found an available step, navigate to it
                this.navigateToStep(i);
                return;
            }
        }
        
        // No available steps found, hide tutorial
        console.log('No available steps found, hiding tutorial');
        this.hideTutorial();
    }

    navigateToStep(stepIndex) {
        const tutorial = this.tutorials[this.currentTutorial];
        
        if (stepIndex >= 0 && stepIndex < tutorial.steps.length) {
            this.currentStep = stepIndex;
            this.currentSubstep = 0;
            
            // Update content
            const stepNameElement = this.modalElement.querySelector('.tutorial-step-name');
            const explanationElement = this.modalElement.querySelector('.tutorial-explanation');
            
            const step = tutorial.steps[this.currentStep];
            stepNameElement.textContent = `: ${step.title}`;
            
            const availableSubsteps = this.getAvailableSubsteps(step);
            explanationElement.textContent = availableSubsteps[0];
            
            // Update navigation
            this.createStepNavigation();
            this.createNavigationDots(availableSubsteps, 0);
            
            // Save state
            this.saveTutorialState();
        }
    }

    markSubstepAsVisited(stepIndex, substepIndex) {
        this.visitedSubsteps.add(`${stepIndex}-${substepIndex}`);
        this.saveTutorialState();
    }

    goToSubstep(substepIndex) {
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        const context = this.getCurrentContext();
        
        // Check if the requested substep should be shown
        const substep = step.substeps[substepIndex];
        if (!substep || !this.evaluateShowWhen(substep.showWhen, context)) {
            console.log(`Cannot navigate to substep ${substepIndex} - not available for current context`);
            return;
        }
        
        if (substepIndex >= 0 && substepIndex < step.substeps.length) {
            this.currentSubstep = substepIndex;
            
            // Mark this substep as visited (general logic, not just for forms)
            this.markSubstepAsVisited(this.currentStep, substepIndex);
            
            // Update content
            const explanationElement = this.modalElement.querySelector('.tutorial-explanation');
            explanationElement.textContent = substep.text;
            
            // Update dots
            this.createNavigationDots(step.substeps.map(s => s.text), substepIndex);
            
            // Save state
            this.saveTutorialState();
        }
    }

    checkForActiveTutorial() {
        const activeTutorial = localStorage.getItem('activeTutorial');
        
        if (activeTutorial) {
            const tutorialData = JSON.parse(activeTutorial);
            
            this.currentTutorial = tutorialData.tutorialType;
            this.currentStep = tutorialData.step || 0;
            this.currentSubstep = tutorialData.substep || 0;
            
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
        
        const tutorial = this.tutorials[this.currentTutorial];
        const context = this.getCurrentContext();
        
        // Check if the current step is still valid for this context
        const currentStep = tutorial.steps[this.currentStep];
        if (currentStep && this.evaluateSkipStep(currentStep.skipStep, context)) {
            // Current step should be skipped, find the next appropriate step
            this.updateTutorialForContext();
            return;
        }
        
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
        const titleElement = this.modalElement.querySelector('.tutorial-title');
        const stepNameElement = this.modalElement.querySelector('.tutorial-step-name');
        const explanationElement = this.modalElement.querySelector('.tutorial-explanation');
        
        titleElement.textContent = tutorial.title;
        stepNameElement.textContent = `: ${step.title}`;
        explanationElement.textContent = step.substeps[availableSubstepIndex].text;
        
        // Create navigation dots for all substeps
        this.createNavigationDots(step.substeps.map(s => s.text), availableSubstepIndex);
        this.createStepNavigation();
        
        // Show the modal
        this.modalElement.classList.remove('display-none');
        
        // Add margin to page content
        setTimeout(() => this.addPageMargin(), 10); // Small delay to ensure modal is rendered
    }

    saveTutorialState() {
        if (this.currentTutorial) {
            const tutorialState = {
                tutorialType: this.currentTutorial,
                step: this.currentStep,
                substep: this.currentSubstep,
                visitedSubsteps: Array.from(this.visitedSubsteps),
                timestamp: Date.now()
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
    }

    getAvailableSubsteps(step) {
        // Return all substeps (we'll handle visibility through dot states)
        return step.substeps.map(substep => substep.text);
    }

    getCurrentContext() {
        // Detect current page
        const path = window.location.pathname;
        let page = 'home';
        
        if (path.includes('/text/create') || this.isCreatePage()) {
            page = 'create';
        } else if (path.includes('/text')) {
            page = 'texts';
        } else if (path.includes('/collab')) {
            page = 'collab';
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

        return { 
            page, 
            userLoggedIn,
            canPublish: this.formValidationState.canPublish
        };
    }

    isCreatePage() {
        // Check if we're on a create page (either /text/create or /text/edit with root text)
        const path = window.location.pathname;
        
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
        
        const { page, userLoggedIn, canPublish } = context;
        
        // First, check if there's a logical operator
        if (condition.includes('&&')) {
            const parts = condition.split('&&').map(part => part.trim());
            const leftResult = this.evaluateSimpleCondition(parts[0], context);
            const rightResult = this.evaluateSimpleCondition(parts[1], context);
            return leftResult && rightResult;
        }
        
        if (condition.includes('||')) {
            const parts = condition.split('||').map(part => part.trim());
            const leftResult = this.evaluateSimpleCondition(parts[0], context);
            const rightResult = this.evaluateSimpleCondition(parts[1], context);
            return leftResult || rightResult;
        }
        
        // No logical operator, evaluate as simple condition
        return this.evaluateSimpleCondition(condition, context);
    }

    evaluateSimpleCondition(condition, context) {
        const { page, userLoggedIn, canPublish } = context;
        console.log('condition: ', condition);
        console.log('context: ', context);
        
        // Handle simple conditions
        if (condition === 'userLoggedIn') {
            return userLoggedIn;
        }
        
        if (condition === '!userLoggedIn') {
            return !userLoggedIn;
        }
        
        if (condition === 'canPublish') {
            return canPublish;
        }
        
        // Handle page equality conditions
        if (condition.includes('page ===')) {
            const pageMatch = condition.match(/page === "([^"]+)"/);
            if (pageMatch) {
                const requiredPage = pageMatch[1];
                return page === requiredPage;
            }
        }
        
        if (condition.includes('page !==')) {
            const pageMatch = condition.match(/page !== "([^"]+)"/);
            if (pageMatch) {
                const requiredPage = pageMatch[1];
                return page !== requiredPage;
            }
        }
        
        return false;
    }
}