# Simple Visibility + Focus Approach

## Core Principle

**Field substeps**: Show when field is focused AND (visible OR buttons not visible)  
**Publish substep**: Show when buttons visible AND field is focused but not visible  
**General info**: Fallback when nothing else matches

**Key insight**: If buttons aren't visible, stay on field substep even if field scrolled away

## Simple Property Structure

```javascript
{
    text: '...',
    field: 'title',  // Used for focus-based navigation
    requiresFocusAndVisible: 'title',  // Explicit: must be focused AND visible
    showWhen: 'page === "create" && !canPublish'
}

{
    text: '...',
    requiresButtonsVisible: true,  // Explicit: buttons must be visible
    showWhen: 'page === "create" && !anyFieldFocusedAndVisible'
}
```

## Even Simpler: Context Variables

Instead of complex properties, add context variables that are automatically computed:

```javascript
// In context
fieldFocused: {                      // per-field: is focused (regardless of visibility)
    title: false,
    prompt: false,
    writing: false
},
fieldVisible: {                      // per-field: is visible
    title: false,
    prompt: false,
    writing: false
},
fieldFocusedAndVisible: {           // per-field: focused AND visible
    title: false,
    prompt: false,
    writing: false
},
anyFieldFocused: false,             // true if any field is focused
anyFieldFocusedAndVisible: false,   // true if any field is focused AND visible
buttonsVisible: false               // true if .form-btns is visible
```

## Substep Definitions (Simple)

```javascript
substeps: [
    {
        text: 'tutorial.start-game.steps.write.substeps.create',
        showWhen: 'page === "create" && !canPublish && !anyFieldFocused && !buttonsVisible',
        // General info: only when no field focused AND buttons not visible
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.title',
        field: 'title',
        showWhen: 'page === "create" && !canPublish && fieldFocused.title && (fieldVisible.title || !buttonsVisible)',
        // Title: when focused AND (visible OR buttons not visible)
        // This means: stay on title substep if focused, even if scrolled away (unless buttons visible)
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.prompt',
        field: 'prompt',
        showWhen: 'page === "create" && !canPublish && fieldFocused.prompt && (fieldVisible.prompt || !buttonsVisible)',
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.writing',
        field: 'writing',
        showWhen: 'page === "create" && !canPublish && fieldFocused.writing && (fieldVisible.writing || !buttonsVisible)',
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.publish',
        field: ['keywords', 'invitees'],
        showWhen: 'page === "create" && (canPublish || (buttonsVisible && anyFieldFocused && !anyFieldFocusedAndVisible))',
        // Publish: when form valid OR (buttons visible AND field focused but not visible)
    }
]
```

## How Context Variables Are Computed

```javascript
getCurrentContext() {
    // ... existing context ...
    
    // Track field states separately
    const fieldFocused = {
        title: this.isFieldFocused('title'),
        prompt: this.isFieldFocused('prompt'),
        writing: this.isFieldFocused('writing')
    };
    
    const fieldVisible = {
        title: this.isFieldVisible('title'),
        prompt: this.isFieldVisible('prompt'),
        writing: this.isFieldVisible('writing')
    };
    
    const fieldFocusedAndVisible = {
        title: fieldFocused.title && fieldVisible.title,
        prompt: fieldFocused.prompt && fieldVisible.prompt,
        writing: fieldFocused.writing && fieldVisible.writing
    };
    
    const anyFieldFocused = fieldFocused.title || fieldFocused.prompt || fieldFocused.writing;
    const anyFieldFocusedAndVisible = fieldFocusedAndVisible.title || 
                                      fieldFocusedAndVisible.prompt || 
                                      fieldFocusedAndVisible.writing;
    
    const buttonsVisible = this.isElementVisible('.form-btns');
    
    return {
        // ... existing context ...
        fieldFocused: fieldFocused,
        fieldVisible: fieldVisible,
        fieldFocusedAndVisible: fieldFocusedAndVisible,
        anyFieldFocused: anyFieldFocused,
        anyFieldFocusedAndVisible: anyFieldFocusedAndVisible,
        buttonsVisible: buttonsVisible
    };
}

isFieldFocused(fieldName) {
    const fieldElement = this.findFieldElement(fieldName);
    if (!fieldElement) return false;
    
    return document.activeElement === fieldElement || 
           fieldElement.contains(document.activeElement);
}

isFieldVisible(fieldName) {
    const fieldElement = this.findFieldElement(fieldName);
    if (!fieldElement) return false;
    
    return this.isElementVisible(fieldElement);
}
```

## Scenarios

### Scenario 1: User focuses title, scrolls away, buttons visible
- Title focused ✅, visible ❌ → `fieldFocused.title = true`, `fieldVisible.title = false`
- Buttons visible ✅ → `buttonsVisible = true`
- Title substep: `fieldFocused.title && (fieldVisible.title || !buttonsVisible)` = `true && (false || false)` = **false** ❌
- Publish substep: `buttonsVisible && anyFieldFocused && !anyFieldFocusedAndVisible` = `true && true && true` = **true** ✅
- **Result**: Publish substep matches ✅

### Scenario 2: User focuses title, scrolls away, buttons NOT visible
- Title focused ✅, visible ❌ → `fieldFocused.title = true`, `fieldVisible.title = false`
- Buttons visible ❌ → `buttonsVisible = false`
- Title substep: `fieldFocused.title && (fieldVisible.title || !buttonsVisible)` = `true && (false || true)` = **true** ✅
- **Result**: Title substep matches ✅ (stays on title even though scrolled away)

### Scenario 3: User scrolls back, title still focused
- Title focused ✅, visible ✅ → `fieldFocused.title = true`, `fieldVisible.title = true`
- Title substep: `fieldFocused.title && (fieldVisible.title || !buttonsVisible)` = `true && (true || ...)` = **true** ✅
- **Result**: Title substep matches ✅ (first in array)

### Scenario 4: User scrolls back, title lost focus
- Title focused ❌, visible ✅ → `fieldFocused.title = false`
- Buttons visible ✅ → `buttonsVisible = true`
- Title substep: `fieldFocused.title && ...` = **false** ❌
- Publish substep: `buttonsVisible && anyFieldFocused && !anyFieldFocusedAndVisible` = `true && false && ...` = **false** ❌
- General info: `!anyFieldFocused && !buttonsVisible` = `true && false` = **false** ❌
- **Wait, nothing matches?** Need to handle this case...

Actually, if title lost focus and buttons visible, we probably want publish. Let me reconsider publish condition:
- Publish: `canPublish || (buttonsVisible && !anyFieldFocusedAndVisible)`
- If no field focused: `anyFieldFocused = false`, so publish condition = `canPublish || false`
- **Result**: Publish if `canPublish`, otherwise general info

### Scenario 5: First arrival on page
- No field focused → `anyFieldFocused = false`
- Buttons may or may not be visible
- General info: `!anyFieldFocused && !buttonsVisible` = `true && !buttonsVisible`
- **Result**: General info matches if buttons not visible ✅

## Observers Setup

Only need to observe:
1. **Form fields** (title, prompt, writing) - for focus AND visibility
2. **Buttons** (.form-btns) - for visibility

When any of these change, invalidate context and re-evaluate.

## Implementation

```javascript
// Track observers
this.fieldObservers = new Map();  // fieldName -> IntersectionObserver
this.focusListeners = new Set();   // Track focus listeners
this.buttonsObserver = null;

setupObservers() {
    // Observe buttons
    const buttons = document.querySelector('.form-btns');
    if (buttons) {
        this.buttonsObserver = new IntersectionObserver(() => {
            this.invalidateContext();
            this.updateTutorialForContext();
        }, { threshold: 0 });
        this.buttonsObserver.observe(buttons);
    }
    
    // Observe fields (title, prompt, writing)
    ['title', 'prompt', 'writing'].forEach(fieldName => {
        const element = this.findFieldElement(fieldName);
        if (element) {
            // Visibility observer
            const observer = new IntersectionObserver(() => {
                this.invalidateContext();
                this.updateTutorialForContext();
            }, { threshold: 0 });
            observer.observe(element);
            this.fieldObservers.set(fieldName, observer);
            
            // Focus listener (only need one global listener)
            if (this.focusListeners.size === 0) {
                document.addEventListener('focusin', () => {
                    this.invalidateContext();
                    this.updateTutorialForContext();
                });
                document.addEventListener('focusout', () => {
                    this.invalidateContext();
                    this.updateTutorialForContext();
                });
                this.focusListeners.add('global');
            }
        }
    });
}
```

## Why This Is Simple

1. **Clear conditions**: Each substep has explicit `showWhen` that's easy to read
2. **Automatic computation**: Context variables computed from current state
3. **Minimal observers**: Only observe what we need (fields + buttons)
4. **No complex state**: Just check current state, don't track history
5. **Focus + Visibility together**: One check `isFieldFocusedAndVisible()` handles both

## The Logic

**Priority order** (first matching wins):
1. Field substeps: `fieldFocused.fieldName && (fieldVisible.fieldName || !buttonsVisible)`
   - Show if field focused AND (visible OR buttons not visible)
2. Publish: `canPublish || (buttonsVisible && anyFieldFocused && !anyFieldFocusedAndVisible)`
   - Show if form valid OR (buttons visible AND field focused but scrolled away)
3. General info: `!anyFieldFocused && !buttonsVisible`
   - Show if no field focused AND buttons not visible

This ensures:
- If field focused → show field substep (unless scrolled away AND buttons visible)
- If field focused but scrolled away AND buttons visible → show publish
- If no field focused AND buttons visible → show publish (if canPublish) or general info
- If no field focused AND buttons not visible → show general info
