# Implementation Options for Scroll-Away Detection

## The Goal
When user is on a field-specific substep (title, prompt, writing) and scrolls away from that field while buttons are visible, automatically show the "publish" substep.

## Current State
- **title substep**: `field: 'title'`, `showWhen: 'page === "create" && !canPublish'`
- **prompt substep**: `field: 'prompt'`, `showWhen: 'page === "create" && !canPublish'`
- **writing substep**: `field: 'writing'`, `showWhen: 'page === "create" && !canPublish'`
- **publish substep**: `field: ['keywords', 'invitees']`, `showWhen: 'page === "create"'`

## Option 1: Context Variable Approach (Recommended)

### How it works:
- Add a context variable `fieldsScrolledAway: boolean` that the watcher updates
- Publish substep uses this in `showWhen` condition
- Watcher automatically manages the variable

### Implementation:
```javascript
// In context
fieldsScrolledAway: false  // Set by watcher when condition is met

// In substep
{
    text: 'tutorial.start-game.steps.write.substeps.publish',
    field: ['keywords', 'invitees'],
    showWhen: 'page === "create" && (canPublish || fieldsScrolledAway)',
}

// Watcher callback
onDisengage: () => {
    this.fieldsScrolledAway = true;
    this.invalidateContext();
    this.updateTutorialForContext();
}
```

### Pros:
- ✅ Clean separation: watcher updates state, tutorial evaluates conditions
- ✅ Works with existing `showWhen` system
- ✅ Can combine with other conditions (`canPublish || fieldsScrolledAway`)
- ✅ Easy to understand and maintain

### Cons:
- ⚠️ Need to reset `fieldsScrolledAway` when user scrolls back or changes substep
- ⚠️ Need to handle state management

---

## Option 2: Property-Based Observation Flag

### How it works:
- Add `observeScrollAway: true` property to substeps that need watching
- System automatically starts/stops watcher based on this flag
- Watcher triggers context invalidation, which re-evaluates all substeps

### Implementation:
```javascript
// In substep
{
    text: 'tutorial.start-game.steps.write.substeps.title',
    field: 'title',
    observeScrollAway: true,  // Flag to enable watcher
    showWhen: 'page === "create" && !canPublish',
}

// Publish substep
{
    text: 'tutorial.start-game.steps.write.substeps.publish',
    field: ['keywords', 'invitees'],
    showWhen: 'page === "create" && (canPublish || fieldsScrolledAway)',
}
```

### Pros:
- ✅ Explicit: clear which substeps need observation
- ✅ Flexible: can enable/disable per substep
- ✅ Self-documenting code

### Cons:
- ⚠️ Still need context variable for `showWhen` condition
- ⚠️ Adds another property to maintain

---

## Option 3: Implicit Based on Field Property

### How it works:
- If substep has `field` property AND field is in watched list → automatically observe
- No extra properties needed
- Watcher manages itself based on current substep

### Implementation:
```javascript
// No changes to substep definition needed
// System automatically watches if field is in watchedFields array

const watchedFields = ['title', 'prompt', 'writing'];

// In manageFocusWatcher()
if (substep.field && watchedFields.includes(substep.field)) {
    // Start/update watcher
}
```

### Pros:
- ✅ Simplest: no new properties
- ✅ Automatic: just works based on existing `field` property
- ✅ Less code to maintain

### Cons:
- ⚠️ Less explicit: have to know which fields are watched
- ⚠️ Still need context variable for condition

---

## Option 4: Separate "Scroll Away" Condition

### How it works:
- Add `scrollAwayCondition` property to substeps
- This condition is evaluated separately from `showWhen`
- When met, automatically navigate to target substep

### Implementation:
```javascript
{
    text: 'tutorial.start-game.steps.write.substeps.title',
    field: 'title',
    showWhen: 'page === "create" && !canPublish',
    scrollAwayCondition: {
        targetSubstep: 'publish',  // Index or identifier
        condition: 'fieldsScrolledAway && canPublish'
    }
}
```

### Pros:
- ✅ Very explicit about behavior
- ✅ Can target specific substeps
- ✅ Separates scroll-away logic from general visibility

### Cons:
- ⚠️ More complex: new property structure
- ⚠️ Might be overkill for this use case

---

## Recommended Approach: Hybrid (Option 1 + Option 3)

### Best of both worlds:
1. **Implicit observation** based on `field` property (Option 3)
2. **Context variable** for `showWhen` conditions (Option 1)
3. **Optional flag** if you need exceptions (Option 2)

### Implementation:
```javascript
// 1. Define watched fields
this.watchedFields = ['title', 'prompt', 'writing'];

// 2. Add context variable
fieldsScrolledAway: false  // Updated by watcher

// 3. Watcher automatically manages based on substep.field
// If field is in watchedFields → observe
// If not → don't observe

// 4. Publish substep condition
{
    text: 'tutorial.start-game.steps.write.substeps.publish',
    field: ['keywords', 'invitees'],
    showWhen: 'page === "create" && (canPublish || fieldsScrolledAway)',
}

// 5. Reset logic
// When user navigates to a field substep → reset fieldsScrolledAway = false
// When user scrolls back to field → reset fieldsScrolledAway = false
```

### State Management:
```javascript
// When watcher triggers (fields scrolled away)
onDisengage: () => {
    this.fieldsScrolledAway = true;
    this.invalidateContext();
    this.updateTutorialForContext(); // Will show publish substep
}

// When user navigates to field substep
goToSubstep(index) {
    // If this is a watched field substep, reset the flag
    if (this.isWatchedFieldSubstep()) {
        this.fieldsScrolledAway = false;
    }
    // ... rest of navigation
}

// When field becomes visible again (watcher detects)
// Could add onReengage callback to watcher
```

---

## Questions to Consider:

1. **What happens when user scrolls back to the field?**
   - Should it go back to field substep?
   - Or stay on publish substep?

2. **What if form becomes valid (canPublish = true) while on field substep?**
   - Should it immediately show publish?
   - Or wait for scroll-away?

3. **What if user manually navigates to publish substep?**
   - Should it reset fieldsScrolledAway?
   - Or keep the state?

4. **Multiple fields scenario:**
   - If watching multiple fields (array), should ALL be scrolled away?
   - Or ANY one scrolled away?
