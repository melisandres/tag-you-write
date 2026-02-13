# What Triggers Tutorial Re-Evaluation

## Current Triggers

The tutorial system re-evaluates conditions when `invalidateContext()` is called, followed by `updateTutorialForContext()`.

### 1. **Page Navigation**
- `popstate` event (browser back/forward)
- URL change detection (polling every 500ms)

### 2. **Form Validation Changes**
- `validationChanged` event from ValidationManager
- Updates `canPublish` state

### 3. **UI State Changes** (via eventBus)
- `modalOpened` / `modalClosed` events
- `shelfNodeOpened` / `shelfNodeClosed` events
- `showcaseChanged` / `showcaseTypeChanged` events

### 4. **Tutorial Completion Events**
- `voteToggle` event
- `publishSuccess` event

### 5. **Manual Navigation**
- User clicks prev/next buttons
- User clicks step navigation dots
- `goToStep()` / `goToSubstep()` methods

### 6. **Form Field Focus** (current implementation)
- `focusin` events on form fields
- Triggers `showSubstepForField()` which navigates directly

## What's Missing for Visibility-Based Approach

For the visibility-based approach to work, we need to add:

### 1. **Focus Events** (already partially there)
- `focusin` / `focusout` on document
- Currently only used for field navigation, not context re-evaluation

### 2. **Visibility Changes** (NEW - need to add)
- IntersectionObserver on form fields (title, prompt, writing)
- IntersectionObserver on buttons (.form-btns)
- When visibility changes → `invalidateContext()` → `updateTutorialForContext()`

### 3. **Scroll Events** (optional, but could help)
- Could listen to scroll events as backup
- But IntersectionObserver is more efficient

## Implementation Needed

```javascript
setupVisibilityObservers() {
    // Observe buttons
    const buttons = document.querySelector('.form-btns');
    if (buttons) {
        const observer = new IntersectionObserver(() => {
            this.invalidateContext();
            this.updateTutorialForContext();
        }, { threshold: 0 });
        observer.observe(buttons);
        this.buttonsObserver = observer;
    }
    
    // Observe fields
    ['title', 'prompt', 'writing'].forEach(fieldName => {
        const element = this.findFieldElement(fieldName);
        if (element) {
            const observer = new IntersectionObserver(() => {
                this.invalidateContext();
                this.updateTutorialForContext();
            }, { threshold: 0 });
            observer.observe(element);
            this.fieldObservers.set(fieldName, observer);
        }
    });
    
    // Global focus listeners (only need once)
    document.addEventListener('focusin', () => {
        this.invalidateContext();
        this.updateTutorialForContext();
    });
    document.addEventListener('focusout', () => {
        this.invalidateContext();
        this.updateTutorialForContext();
    });
}
```

## Summary

**Current triggers**: Page changes, validation, UI state, completion events, manual navigation

**Missing for visibility approach**: 
- Focus events (need to add global listeners)
- Visibility changes (need IntersectionObserver on fields + buttons)

The key is: when visibility or focus changes, call `invalidateContext()` then `updateTutorialForContext()`, which will re-evaluate all `showWhen` conditions and pick the first matching substep.
