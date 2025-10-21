# Tutorial System Architecture & Implementation Guide

## Overview

The tutorial system is a sophisticated, context-aware guidance system that provides step-by-step instructions to users based on their current page, form state, and UI interactions. It uses a combination of localStorage persistence, event-driven architecture, and dynamic context evaluation to create seamless user experiences.

## System Architecture

### Core Components

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│                     │    │                      │    │                     │
│ TutorialSwitcherMgr │────│    TutorialModal     │────│   EventBus System   │
│                     │    │                      │    │                     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                           │                           │
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│                     │    │                      │    │                     │
│   FormManager       │────│  ValidationManager   │────│   RefreshManager    │
│                     │    │                      │    │                     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                           │                           │
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│                     │    │                      │    │                     │
│    DataManager      │────│   localStorage        │────│   Context System    │
│                     │    │                      │    │                     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## Component Breakdown

### 1. TutorialModal (`tutorialModal.js`)

**Purpose**: Core tutorial display and logic engine

**Key Features**:
- **Context-Aware Navigation**: Automatically progresses based on user state
- **Dynamic Content**: Shows different substeps based on current conditions
- **State Persistence**: Saves progress to localStorage
- **Event-Driven Updates**: Responds to form validation, UI changes, and user actions

**Core Methods**:
```javascript
// Context evaluation and tutorial progression
getCurrentContext()           // Evaluates current page, user state, form validity
updateTutorialForContext()   // Updates tutorial based on context changes
evaluateCondition()         // Evaluates showWhen/skipStep conditions

// State management
saveTutorialState()         // Persists tutorial state to localStorage
checkForActiveTutorial()    // Restores tutorial from localStorage on page load

// Event handling
handleValidationChange()    // Responds to form validation changes
handleTutorialCompletion()  // Processes tutorial completion events
```

**Tutorial Definition Structure**:
```javascript
this.tutorials = {
    'tutorial-name': {
        title: 'tutorial.title.key',
        completion: {
            triggerEvent: 'eventName'  // Event that completes tutorial
        },
        steps: [
            {
                title: 'step.title.key',
                skipStep: 'condition',  // Skip this step if condition is true
                substeps: [
                    {
                        text: 'substep.text.key',
                        showWhen: 'condition'  // Show this substep if condition is true
                    }
                ]
            }
        ]
    }
}
```

### 2. TutorialSwitcherManager (`tutorialSwitcherManager.js`)

**Purpose**: UI controller for tutorial selection and initialization

**Key Features**:
- **Tutorial Selection**: Handles dropdown menus and navigation links
- **Modal Initialization**: Dynamically creates tutorial modal if needed
- **State Synchronization**: Updates UI to reflect active tutorial state
- **Event Coordination**: Bridges UI interactions with tutorial system

**Core Methods**:
```javascript
startTutorial(tutorialType)           // Initiates a new tutorial
initTutorialModal()                   // Creates and initializes modal
updateTutorialActiveStates()          // Updates UI to show active tutorial
setupValidationListener()             // Forwards validation events to modal
```

### 3. EventBus System (`eventBus.js`)

**Purpose**: Centralized event communication system

**Key Events for Tutorial System**:
```javascript
// Tutorial lifecycle
'tutorialClosed'              // Tutorial is closed
'validationChanged'           // Form validation state changed
'publishSuccess'             // Content successfully published
'voteToggle'                  // Vote action completed

// UI state changes
'modalOpened'                // Story modal opened
'modalClosed'                // Story modal closed
'shelfNodeOpened'            // Shelf node expanded
'shelfNodeClosed'            // Shelf node collapsed
'showcaseChanged'            // Showcase type changed
'showcaseTypeChanged'        // Showcase switched between tree/shelf
```

### 4. FormManager Integration (`formManager.js`)

**Purpose**: Handles form interactions and emits tutorial-relevant events

**Tutorial Integration**:
```javascript
// Emits events that tutorials listen for
// The data sent the publishSuccess is the same data received from the backend to create the toast
eventBus.emit('publishSuccess', {
    action: this.formType,     // 'root', 'iteration', etc.
    textId: responseData.textId,
    message: responseData.toastMessage
});
```

### 5. ValidationManager Integration (`validationManager.js`)

**Purpose**: Manages form validation and communicates state to tutorial system

**Tutorial Integration**:
```javascript
// Emits validation changes that tutorials use for context
eventBus.emit('validationChanged', {
    canAutosave: boolean,
    canPublish: boolean,
    fields: object
});
```

### 6. RefreshManager Integration (`refreshManager.js`)

**Purpose**: Manages page state persistence and form data restoration

**Tutorial Integration**:
```javascript
// Stores and retrieves form validity for tutorial context
storeFormValidity()          // Saves validation state
getFormValidity()            // Retrieves validation state
```

## Context System

### Context Variables

The tutorial system evaluates these context variables to determine what content to show:

```javascript
{
    page: string,              // 'home', 'create', 'iterate', 'edit', 'dashboard', etc.
    userLoggedIn: boolean,     // Whether user is authenticated
    canPublish: boolean,       // Whether form is valid for publishing
    showcase: string,         // 'tree', 'shelf', or null
    showcaseVisible: boolean,  // Whether showcase is currently visible
    category: string,          // 'canJoin', 'myGames', 'other', or null
    gameId: string,           // Current Root story Id, from the URL -- to check the category of a single story (collab page)
    modalOpen: boolean,       // Whether story modal is open
    modalTextId: string,      // ID of open modal's text
    openShelfCount: number,   // Number of open shelf nodes
    hasOpenShelf: boolean,   // Whether any shelf nodes are open
    success: boolean          // Whether tutorial has been completed
}
```

### Context Evaluation

Tutorials use JavaScript expressions to evaluate context:

```javascript
// Example conditions
showWhen: 'page === "create" && !canPublish'           // Show when on create page and form not ready
skipStep: 'userLoggedIn && page === "dashboard"'       // Skip if user logged in and on dashboard
showWhen: '((page === "texts" && category === "canJoin") || (page === "collab" && category === "canJoin")) && userLoggedIn && !showcaseVisible'
```

## localStorage State Management

### Tutorial State Structure

```javascript
{
    tutorialType: string,        // 'start-game', 'contribute', 'vote'
    step: number,               // Current step index
    substep: number,            // Current substep index
    visitedSubsteps: string[],  // Array of visited substep IDs
    tutorialSuccess: boolean   // Whether tutorial is completed
}
```

### State Persistence Flow

1. **Save State**: Every tutorial action saves current state to localStorage
2. **Restore State**: On page load, system checks for active tutorial and restores state
3. **Context Updates**: State is updated when context changes (page navigation, form validation, etc.)
4. **Completion Tracking**: Success state is preserved until tutorial is closed

## Adding a New Tutorial

### Step 1: Define Tutorial Structure

Add your tutorial to the `tutorials` object in `TutorialModal`:

```javascript
'your-tutorial-name': {
    title: 'tutorial.your_tutorial.title',
    completion: {
        triggerEvent: 'yourCompletionEvent'  // Event that completes tutorial
    },
    steps: [
        {
            title: 'tutorial.your_tutorial.step1.title',
            skipStep: 'condition',  // Optional: skip if condition is true
            substeps: [
                {
                    text: 'tutorial.your_tutorial.step1.substep1.text',
                    showWhen: 'condition'  // Show when condition is true
                }
            ]
        }
    ]
}
```

### Step 2: Add Translation Keys

Add translation keys to your language files:

```json
// translations/en.json
{
    "tutorial": {
        "your_tutorial": {
            "title": "Your Tutorial Title",
            "step1": {
                "title": "Step 1 Title",
                "substep1": {
                    "text": "This is the instruction text for substep 1"
                }
            }
        }
    }
}
```

### Step 3: Add UI Elements

Add tutorial switcher elements to your HTML:

```html
<!-- Main navigation dropdown -->
<div class="tutorial-switcher">
    <div class="current-tutorial">Tutorials</div>
    <div class="tutorial-dropdown">
        <a href="#" data-tutorial="your-tutorial-name">Your Tutorial</a>
    </div>
</div>

<!-- Or in overflow menu -->
<div class="submenu-content tutorial-submenu">
    <a href="#" data-tutorial="your-tutorial-name">Your Tutorial</a>
</div>
```

### Step 4: Handle Completion Events

If your tutorial has completion events, ensure they're emitted:

```javascript
// In your component/manager
eventBus.emit('yourCompletionEvent', {
    // relevant data
});
```

## Context-Driven Tutorial Flow

### Automatic Progression

1. **Context Evaluation**: System continuously evaluates current context
2. **Step Selection**: Finds appropriate step based on context conditions
3. **Substep Selection**: Chooses best substep for current conditions
4. **Content Update**: Updates tutorial display with relevant content
5. **State Persistence**: Saves current state to localStorage

### Manual Navigation

Users can manually navigate tutorials using:
- **Previous/Next Buttons**: Navigate between steps and substeps
- **Step Breadcrumbs**: Click to jump to specific steps
- **Substep Dots**: Click to jump to specific substeps

### Event-Driven Updates

Tutorials automatically update when:
- **Form Validation Changes**: `canPublish` state changes
- **Page Navigation**: User moves to different pages
- **UI State Changes**: Modals open/close, shelf nodes expand/collapse
- **Completion Events**: User completes tutorial actions

## Advanced Features

### Shared Steps

Reusable step definitions for common patterns:

```javascript
this.sharedSteps = {
    login: {
        title: 'tutorial.shared_steps.login.title',
        skipStep: 'userLoggedIn',
        substeps: [
            {
                text: 'tutorial.shared_steps.login.substeps.navigation',
                showWhen: 'page !== "login" && page !== "writer-create"'
            }
        ]
    }
}
```

### Conditional Display

Tutorials can show different content based on context:

```javascript
substeps: [
    {
        text: 'tutorial.step.substeps.option_a',
        showWhen: 'conditionA'
    },
    {
        text: 'tutorial.step.substeps.option_b', 
        showWhen: 'conditionB'
    }
]
```

### Success State Management

Tutorials track completion and show success messages:

```javascript
// Tutorial completion triggers success state
this.tutorialSuccess = true;

// Success step shows congratulations
{
    title: 'tutorial.steps.success.title',
    skipStep: '!success',  // Only show when success is true
    substeps: [
        {
            text: 'tutorial.steps.success.substeps.congratulations',
            showWhen: 'success'
        }
    ]
}
```

## Best Practices

### 1. Context Conditions
- Use clear, readable condition expressions
- Test conditions thoroughly with different user states
- Consider edge cases and error states

### 2. Translation Keys
- Use consistent naming conventions
- Group related translations logically
- Include context in key names when helpful

### 3. Tutorial Structure
- Keep steps focused and actionable
- Use substeps for conditional content
- Provide clear completion criteria

### 4. Event Integration
- Emit events at appropriate times
- Include relevant data in event payloads
- Handle event failures gracefully

### 5. State Management
- Save state frequently to prevent data loss
- Handle localStorage errors gracefully
- Clean up old state when appropriate

## Debugging

### Console Logging

The tutorial system includes extensive logging:

```javascript
// Enable debug logging
console.log('🎯 TUTORIAL: Context in updateTutorialForContext:', context);
console.log('🎯 TUTORIAL: Current step/substep:', this.currentStep, this.currentSubstep);
```

### Common Issues

1. **Tutorial Not Starting**: Check localStorage for `activeTutorial`
2. **Wrong Content Showing**: Check context conditions and conditions
3. **State Not Persisting**: Verify `saveTutorialState()` is being called
4. **Events Not Firing**: Check eventBus listeners and event emission

### Development Tools

```javascript
// Check current tutorial state
console.log('Active tutorial:', localStorage.getItem('activeTutorial'));

// Check current context
console.log('Current context:', tutorialModal.getCurrentContext());

// Force tutorial update
tutorialModal.updateTutorialForContext();
```

## Integration with Other Systems

### Form System
- Tutorials respond to form validation changes
- Provide guidance based on form state
- Track completion through form submissions

### Navigation System
- Tutorials adapt to page changes
- Provide context-aware guidance
- Handle deep linking and URL changes

### UI State Management
- Tutorials respond to modal states
- Adapt to showcase changes
- Handle responsive design changes

### Data Management
- Tutorials use cached data for context
- Respond to data updates
- Handle offline/online state changes

This tutorial system provides a robust, flexible foundation for user guidance that adapts to the user's current context and provides relevant, actionable instructions throughout their journey.
