# Revised Scroll-Away Approach

## Current System Behavior

**Key Finding**: The system selects the **FIRST** valid substep (line 585-587):
```javascript
for (let i = 0; i < step.substeps.length; i++) {
    const substep = step.substeps[i];
    const isValid = this.evaluateShowWhen(substep.showWhen, context);
    if (isValid) {
        availableSubstepIndex = i; // Select the first valid substep
        break; // Stop at the first valid substep
    }
}
```

**This means**: If multiple substeps match, it always picks the first one in the array.

## Current Substep Order
0. General info: `showWhen: 'page === "create" && !canPublish'`
1. Title: `field: 'title'`, `showWhen: 'page === "create" && !canPublish'`
2. Prompt: `field: 'prompt'`, `showWhen: 'page === "create" && !canPublish'`
3. Writing: `field: 'writing'`, `showWhen: 'page === "create" && !canPublish'`
4. Publish: `field: ['keywords', 'invitees']`, `showWhen: 'page === "create"'`

## The Problem

If we remove `!canPublish` from field substeps:
- All field substeps would have: `showWhen: 'page === "create"'`
- When context re-evaluates, it would pick substep 0 (general info) because it's first
- We want it to pick substep 4 (publish) when scrolled away

## Solution: Explicit Field Observer + Context State

### Approach: Track Which Field Was Scrolled Away From

**Key Insight**: We need to know WHICH field was scrolled away from, so we can:
1. Show publish substep when scrolled away
2. Return to the correct field substep when scrolled back

### Implementation Structure

```javascript
// Context variables
fieldsScrolledAway: false,           // General flag
scrolledAwayFromField: null,          // Which field: 'title' | 'prompt' | 'writing' | null
fieldVisible: {                       // Track visibility per field
    title: true,
    prompt: true,
    writing: true
}
```

### Substep Definitions (Explicit)

```javascript
substeps: [
    {
        text: 'tutorial.start-game.steps.write.substeps.create',
        showWhen: 'page === "create" && !canPublish && !fieldsScrolledAway',
        // Only show when nothing else matches
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.title',
        field: 'title',
        fieldObserver: true,  // Explicit: watch this field for scroll-away
        showWhen: 'page === "create" && fieldVisible.title && !fieldsScrolledAway',
        // Show when field is visible AND not scrolled away
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.prompt',
        field: 'prompt',
        fieldObserver: true,
        showWhen: 'page === "create" && fieldVisible.prompt && !fieldsScrolledAway',
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.writing',
        field: 'writing',
        fieldObserver: true,
        showWhen: 'page === "create" && fieldVisible.writing && !fieldsScrolledAway',
    },
    {
        text: 'tutorial.start-game.steps.write.substeps.publish',
        field: ['keywords', 'invitees'],
        fieldObserver: true,  // Watch for scroll-back to fields
        showWhen: 'page === "create" && (canPublish || fieldsScrolledAway)',
        // Show when form is valid OR fields scrolled away
    }
]
```

## How It Works

### Scenario 1: User on Title Substep, Scrolls Away

1. **Initial state**: 
   - On substep 1 (title)
   - `fieldVisible.title = true`
   - `fieldsScrolledAway = false`
   - Watcher observing title field

2. **User scrolls away**:
   - Title field becomes invisible
   - Buttons visible
   - Watcher triggers `onDisengage`
   - Sets: `fieldsScrolledAway = true`, `scrolledAwayFromField = 'title'`, `fieldVisible.title = false`

3. **Context re-evaluates**:
   - Substeps 0-3: All fail (either `!fieldsScrolledAway` or `!fieldVisible.title`)
   - Substep 4 (publish): Matches (`fieldsScrolledAway = true`)
   - System selects substep 4 ✅

### Scenario 2: User Scrolls Back to Title Field

1. **Current state**:
   - On substep 4 (publish)
   - `fieldsScrolledAway = true`
   - `scrolledAwayFromField = 'title'`
   - Watcher on publish substep observes title field (because we know which field to watch)

2. **User scrolls back**:
   - Title field becomes visible
   - Watcher triggers `onReengage` (need to add this)
   - Sets: `fieldsScrolledAway = false`, `scrolledAwayFromField = null`, `fieldVisible.title = true`

3. **Context re-evaluates**:
   - Substep 1 (title): Matches (`fieldVisible.title = true && !fieldsScrolledAway`)
   - System selects substep 1 ✅

## Implementation Details

### 1. Add `fieldObserver` Property

```javascript
{
    field: 'title',
    fieldObserver: true,  // Explicit flag: watch this field
    showWhen: '...'
}
```

**Why explicit?**
- Clear which substeps need observation
- Can have field without observer (e.g., keywords/invitees)
- Easy to see in code what's being watched

### 2. Watcher Management

```javascript
manageFocusWatcher() {
    const substep = this.getCurrentSubstep();
    
    if (substep.fieldObserver) {
        // Determine which fields to watch
        let fieldsToWatch = [];
        
        if (substep.field) {
            // If this substep has a field, watch it
            fieldsToWatch = Array.isArray(substep.field) 
                ? substep.field 
                : [substep.field];
        } else if (this.scrolledAwayFromField) {
            // If we're on publish substep, watch the field we scrolled away from
            fieldsToWatch = [this.scrolledAwayFromField];
        }
        
        // Start/update watcher
        if (fieldsToWatch.length > 0) {
            const selectors = this.getFieldSelectors(fieldsToWatch);
            if (this.focusWatcher) {
                this.focusWatcher.updateFields(selectors);
            } else {
                this.startFocusWatcher(selectors);
            }
        }
    } else {
        // Stop watcher if substep doesn't need it
        this.stopFocusWatcher();
    }
}
```

### 3. Watcher Callbacks

```javascript
// When fields scroll away
onDisengage: (fieldElements) => {
    // Determine which field was scrolled away from
    const fieldName = this.getFieldNameFromElements(fieldElements);
    
    this.fieldsScrolledAway = true;
    this.scrolledAwayFromField = fieldName;
    this.updateFieldVisibility(fieldName, false);
    
    this.invalidateContext();
    this.updateTutorialForContext();
}

// When field becomes visible again (need to add to watcher)
onReengage: (fieldElements) => {
    const fieldName = this.getFieldNameFromElements(fieldElements);
    
    // Only reengage if this is the field we scrolled away from
    if (fieldName === this.scrolledAwayFromField) {
        this.fieldsScrolledAway = false;
        this.scrolledAwayFromField = null;
        this.updateFieldVisibility(fieldName, true);
        
        this.invalidateContext();
        this.updateTutorialForContext();
    }
}
```

### 4. Field Visibility Tracking

```javascript
updateFieldVisibility(fieldName, isVisible) {
    if (!this.fieldVisibility) {
        this.fieldVisibility = {};
    }
    this.fieldVisibility[fieldName] = isVisible;
}

// In context
fieldVisible: {
    title: this.fieldVisibility?.title ?? true,
    prompt: this.fieldVisibility?.prompt ?? true,
    writing: this.fieldVisibility?.writing ?? true
}
```

## Answering Your Questions

### Q1: Can system redirect to both substeps?

**Answer**: No, it picks the **first** matching substep. So we need to ensure:
- Field substeps only match when their field is visible
- Publish substep matches when scrolled away
- General info only matches when nothing else does

### Q2: Scroll-back behavior

**Answer**: Yes, we need to observe on the publish substep too. The watcher should:
- When on field substep: Watch that field for scroll-away
- When on publish substep: Watch the `scrolledAwayFromField` for scroll-back

### Q3: Which substep gets selected?

**Current behavior**: First matching substep (index 0, then 1, then 2, etc.)

**With our approach**:
- If title visible → substep 1 matches first
- If scrolled away → substep 1-3 don't match, substep 4 matches
- If scroll back → substep 1 matches again

## Recommendation

Use **explicit `fieldObserver: true`** property because:
1. ✅ Clear and explicit
2. ✅ Easy to see which substeps are watched
3. ✅ Flexible: can have field without observer
4. ✅ Works with scroll-back: publish substep can also have `fieldObserver: true`

The key is tracking `scrolledAwayFromField` so we know which field to watch when on publish substep.
