# Visibility-Based Approach (Rethought)

## The Problem with Focus-Based Watching

When a field becomes unfocused after scroll-away, it no longer makes sense to watch it. The focus state is transient and unreliable for scroll-away detection.

## New Approach: Visibility Conditions on Substeps

Instead of watching fields, use **visibility conditions** as part of the substep definition. This is more declarative and integrates with the existing `showWhen` system.

## Concept: `isVisible` and `isNotVisible` Properties

```javascript
{
    text: '...',
    field: 'title',  // Still used for focus-based navigation
    showWhen: 'page === "create" && !canPublish',
    isVisible: 'input[name="title"]',      // Element must be visible
    isNotVisible: '.form-btns'             // Element must NOT be visible
}
```

## How It Would Work

### Substep Evaluation Logic

```javascript
evaluateShowWhen(showWhen, context) {
    // Existing logic evaluates showWhen string
    const baseCondition = this.evaluateCondition(showWhen, context);
    
    // Then check visibility conditions
    if (substep.isVisible) {
        const element = document.querySelector(substep.isVisible);
        const isVisible = this.isElementVisible(element);
        if (!isVisible) return false;  // Element must be visible
    }
    
    if (substep.isNotVisible) {
        const element = document.querySelector(substep.isNotVisible);
        const isVisible = this.isElementVisible(element);
        if (isVisible) return false;  // Element must NOT be visible
    }
    
    return baseCondition;
}
```

## Example Substep Definitions

```javascript
substeps: [
    {
        text: 'tutorial.start-game.steps.write.substeps.create',
        showWhen: 'page === "create" && !canPublish',
        isNotVisible: '.form-btns',  // Only show if buttons are NOT visible
        // This prevents showing general info when user has scrolled to buttons
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.title',
        field: 'title',  // Still handles focus navigation
        showWhen: 'page === "create" && !canPublish',
        isVisible: 'input[name="title"]',  // Title field must be visible
        // This means: show when field is focused AND visible
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.prompt',
        field: 'prompt',
        showWhen: 'page === "create" && !canPublish',
        isVisible: 'textarea[name="prompt"]',  // Or CKEditor selector
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.writing',
        field: 'writing',
        showWhen: 'page === "create" && !canPublish',
        isVisible: 'textarea[name="writing"]',  // Or CKEditor selector
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.publish',
        field: ['keywords', 'invitees'],
        showWhen: 'page === "create"',
        isVisible: '.form-btns',  // Buttons must be visible
        // This means: show when form is valid AND buttons are visible
        // OR when scrolled away from fields AND buttons are visible
    }
]
```

## The Logic Flow

### Scenario 1: User on Title Substep, Scrolls Away

1. **Initial state**:
   - On substep 1 (title)
   - Title field is visible ✅
   - Buttons not visible ❌
   - Substep 1 matches: `showWhen` ✅, `isVisible: title` ✅

2. **User scrolls away**:
   - Title field becomes invisible ❌
   - Buttons become visible ✅
   - Context re-evaluates:
     - Substep 0: `showWhen` ✅, but `isNotVisible: .form-btns` ❌ (buttons ARE visible)
     - Substep 1: `showWhen` ✅, but `isVisible: title` ❌ (title NOT visible)
     - Substep 4: `showWhen` ✅, `isVisible: .form-btns` ✅
     - System selects substep 4 ✅

### Scenario 2: User Scrolls Back to Title Field

1. **Current state**:
   - On substep 4 (publish)
   - Title field not visible ❌
   - Buttons visible ✅

2. **User scrolls back**:
   - Title field becomes visible ✅
   - Buttons may or may not be visible
   - Context re-evaluates:
     - Substep 1: `showWhen` ✅, `isVisible: title` ✅
     - System selects substep 1 ✅

## Key Advantages

1. **No focus tracking needed** - Visibility is what matters, not focus
2. **Declarative** - Substep definition clearly states what it needs
3. **Integrates with existing system** - Works with `showWhen` evaluation
4. **No separate watcher** - Everything handled in substep evaluation
5. **Flexible** - Can check visibility of any element, not just fields

## Implementation Questions

### Q1: How to detect visibility changes?

**Option A: Polling** (simple but less efficient)
- Check visibility on every context evaluation
- Use `getBoundingClientRect()` or `IntersectionObserver` internally

**Option B: Event-driven** (more efficient)
- Use `IntersectionObserver` to watch elements
- When visibility changes, invalidate context
- Re-evaluate substeps

**Option B is better** - we can use IntersectionObserver but integrate it into the evaluation system rather than a separate watcher.

### Q2: Which elements to observe?

Only observe elements referenced in `isVisible` or `isNotVisible` properties. This is automatic - we only watch what's needed.

### Q3: How to handle CKEditor fields?

For `prompt` and `writing`, we need to find the CKEditor editable element:
```javascript
isVisible: 'label:has(textarea[name="prompt"]) .ck-editor__editable'
// Or use a helper function to resolve field names to selectors
```

## Revised Implementation Structure

```javascript
// In TutorialModal class

// Track which elements we're observing
this.visibilityObservers = new Map(); // element -> IntersectionObserver

// Method to check if element is visible
isElementVisible(selector) {
    const element = document.querySelector(selector);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
    );
}

// Method to setup visibility observers for a substep
setupVisibilityObservers(substep) {
    const selectors = [];
    
    if (substep.isVisible) selectors.push(substep.isVisible);
    if (substep.isNotVisible) selectors.push(substep.isNotVisible);
    
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element && !this.visibilityObservers.has(element)) {
            const observer = new IntersectionObserver(() => {
                // When visibility changes, invalidate context
                this.invalidateContext();
                this.updateTutorialForContext();
            }, { threshold: 0 });
            
            observer.observe(element);
            this.visibilityObservers.set(element, observer);
        }
    });
}

// Enhanced evaluateShowWhen
evaluateShowWhen(showWhen, context, substep) {
    // Evaluate base condition
    const baseResult = this.evaluateCondition(showWhen, context);
    if (!baseResult) return false;
    
    // Check isVisible
    if (substep.isVisible) {
        if (!this.isElementVisible(substep.isVisible)) {
            return false;
        }
    }
    
    // Check isNotVisible
    if (substep.isNotVisible) {
        if (this.isElementVisible(substep.isNotVisible)) {
            return false;
        }
    }
    
    return true;
}
```

## Benefits of This Approach

1. ✅ **No focus dependency** - Works even if field unfocuses
2. ✅ **Declarative** - Substep definition is self-documenting
3. ✅ **Automatic** - Visibility changes trigger re-evaluation
4. ✅ **Flexible** - Can check any element, not just form fields
5. ✅ **Simpler** - No separate watcher class needed
6. ✅ **Integrated** - Works with existing `showWhen` system

## Potential Issues

1. **Performance**: Observing many elements could be expensive
   - **Solution**: Only observe elements for current step's substeps

2. **CKEditor selectors**: Need reliable way to find CKEditor elements
   - **Solution**: Helper function to resolve field names to selectors

3. **Initial state**: Need to check visibility on first evaluation
   - **Solution**: Check immediately, then observe for changes

## Recommendation

This approach is **much cleaner** because:
- It's declarative (substep says what it needs)
- It doesn't depend on focus state
- It integrates naturally with existing evaluation system
- It's more flexible and maintainable

The key insight: **Visibility is what matters for scroll-away, not focus state.**
