# Unused Visibility Tracking Logic in tutorialModal.js

## Summary
After removing the `FocusToActionsWatcher` approach, there is some unused logic related to visibility tracking that was added but never actually used in `showWhen` conditions.

## Unused Logic (Can be removed)

### 1. `isFocusedFieldVisible()` method
**Location**: Lines 1577-1597
**Status**: ❌ UNUSED
**Reason**: Method exists but is never called except to populate context variable, which itself is unused.

```javascript
isFocusedFieldVisible() {
    const activeElement = document.activeElement;
    if (!activeElement) return true;
    
    if (!activeElement.matches('input, textarea, .ck-editor__editable, .ck-content')) {
        return true;
    }
    
    const rect = activeElement.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < windowHeight &&
        rect.left < windowWidth
    );
}
```

### 2. `focusedFieldVisible` context variable
**Location**: Line 1066 in `getCurrentContext()`
**Status**: ❌ UNUSED
**Reason**: Added to context but never used in any `showWhen` conditions. All substeps just use `page === "create"`.

```javascript
focusedFieldVisible: this.isFocusedFieldVisible() // Whether currently focused field is visible in viewport
```

### 3. `focusedFieldVisible` in `evaluateShowWhen()`
**Location**: Lines 1222, 1238
**Status**: ❌ UNUSED
**Reason**: Variable is destructured and replaced in expression, but no substeps actually use it in their `showWhen` conditions.

```javascript
const { page, userLoggedIn, canPublish, showcase, showcaseVisible, category, gameId, modalOpen, modalTextId, openShelfCount, hasOpenShelf, success, focusedFieldVisible } = context;
// ...
.replace(/focusedFieldVisible/g, focusedFieldVisible);
```

## Used Logic (Keep - Not visibility tracking)

### 1. `updateModalPositionForField()` method
**Location**: Lines 1603-1622
**Status**: ✅ USED
**Reason**: Used for mobile positioning when keyboard appears. Called from:
- `showTutorial()` (line 469)
- `updateTutorialDisplay()` (line 632)
- `goToSubstep()` (line 819)

**Note**: This is NOT visibility tracking - it's just CSS positioning for mobile UX.

### 2. `isMobileDevice()` method
**Location**: Lines 1562-1571
**Status**: ✅ USED
**Reason**: Used by `updateModalPositionForField()` to determine if device is mobile.

### 3. `tutorial-field-focused` CSS class
**Location**: Lines 487, 1618, 1620
**Status**: ✅ USED
**Reason**: Used to apply CSS positioning on mobile devices. Also removed in `hideTutorial()`.

## Current Substep Conditions

All substeps currently use simple conditions:
```javascript
{
    text: 'tutorial.start-game.steps.write.substeps.create',
    showWhen: 'page === "create" && !canPublish',
},
{
    text: 'tutorial.start-game.steps.write.substeps.title',
    field: 'title',
    showWhen: 'page === "create"',  // No visibility check
},
{
    text: 'tutorial.start-game.steps.write.substeps.prompt',
    field: 'prompt',
    showWhen: 'page === "create"',  // No visibility check
},
{
    text: 'tutorial.start-game.steps.write.substeps.writing',
    field: 'writing',
    showWhen: 'page === "create"',  // No visibility check
},
{
    text: 'tutorial.start-game.steps.write.substeps.publish',
    field: ['keywords', 'invitees'],
    showWhen: 'page === "create"',  // No visibility check
}
```

**None of them use `focusedFieldVisible`**, so the entire visibility tracking system is unused.

## Recommendation

**Remove**:
1. `isFocusedFieldVisible()` method (lines 1577-1597)
2. `focusedFieldVisible` from `getCurrentContext()` (line 1066)
3. `focusedFieldVisible` from `evaluateShowWhen()` destructuring and replacement (lines 1222, 1238)

**Keep**:
1. `updateModalPositionForField()` - used for mobile positioning
2. `isMobileDevice()` - used by `updateModalPositionForField()`
3. `tutorial-field-focused` class management - used for CSS positioning
