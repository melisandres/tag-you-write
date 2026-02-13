# How to Integrate FocusToActionsWatcher

## Simple Explanation

### What it does:
Imagine you're on a tutorial step explaining the "title" field. You scroll down the page. The "title" field scrolls off the top of your screen, but you can still see the "Publish" button at the bottom. 

The `FocusToActionsWatcher` detects this situation and can trigger an action (like showing a different tutorial message - the "publish" substep).

### How it works:
1. **Tutorial tells watcher which fields to watch** → Based on current substep's `field` property
2. **You scroll** → The watcher checks: "Are any of the watched fields visible? Is the button area visible?"
3. **If NO fields are visible BUT buttons are visible** → It calls your `onDisengage` function
4. **Tutorial substep changes** → Watcher updates to watch new fields (or stops if no fields)

**Key difference**: The watcher doesn't care about focus - it just watches specific field elements for visibility. The tutorial system handles focus-based navigation separately.

## Integration in TutorialModal

### Step 1: Import the class
```javascript
import { FocusToActionsWatcher } from './focusToActionsWatcher.js';
```

### Step 2: Add properties to constructor
```javascript
constructor(modalElement) {
    // ... existing code ...
    
    // Store the watcher instance (null when not active)
    this.focusWatcher = null;
    
    // Fields that need watching (only title, prompt, writing)
    this.watchedFields = ['title', 'prompt', 'writing'];
}
```

### Step 3: Helper method to convert field name to CSS selector
```javascript
/**
 * Convert field name(s) to CSS selectors for watching
 * Handles regular fields and CKEditor fields
 */
getFieldSelectors(fieldValue) {
    if (!fieldValue) return [];
    
    const fieldNames = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
    const selectors = [];
    
    fieldNames.forEach(fieldName => {
        // Regular input/textarea fields
        selectors.push(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);
        
        // Special case for invitees
        if (fieldName === 'invitees') {
            selectors.push('#invitees-input');
        }
        
        // CKEditor fields (prompt, writing) - find the editable area
        if (['prompt', 'writing'].includes(fieldName)) {
            // Find the label containing this field, then find CKEditor within it
            const label = document.querySelector(`label:has(textarea[name="${fieldName}"])`);
            if (label) {
                const ckEditor = label.querySelector('.ck-editor__editable, .ck-content');
                if (ckEditor) {
                    selectors.push(`#${ckEditor.id || ''}`); // Use ID if available
                }
            }
            // Fallback: try to find by CKEditor instance
            if (window.CKEditorInstances && window.CKEditorInstances[fieldName]) {
                try {
                    const editorElement = window.CKEditorInstances[fieldName].editing?.view?.domRoots?.get('main');
                    if (editorElement) {
                        selectors.push(`#${editorElement.id || ''}`);
                    }
                } catch (e) {
                    // If we can't access, use a more general selector
                    const label = document.querySelector(`label:has(textarea[name="${fieldName}"])`);
                    if (label) {
                        selectors.push(`label:has(textarea[name="${fieldName}"]) .ck-editor__editable`);
                    }
                }
            }
        }
    });
    
    return selectors.filter(s => s); // Remove empty selectors
}
```

### Step 4: Create method to start/stop watcher based on current substep
```javascript
/**
 * Start or stop the focus watcher based on whether current substep needs it
 */
manageFocusWatcher() {
    const tutorial = this.tutorials[this.currentTutorial];
    if (!tutorial) {
        this.stopFocusWatcher();
        return;
    }
    
    const step = tutorial.steps[this.currentStep];
    const substep = step.substeps[this.currentSubstep];
    
    // Check if this substep has a field that we want to watch
    const hasWatchedField = substep.field && 
        (this.watchedFields.includes(substep.field) || 
         (Array.isArray(substep.field) && 
          substep.field.some(f => this.watchedFields.includes(f))));
    
    // If substep needs watching
    if (hasWatchedField) {
        const fieldSelectors = this.getFieldSelectors(substep.field);
        
        // If watcher doesn't exist, create it
        if (!this.focusWatcher) {
            this.startFocusWatcher(fieldSelectors);
        }
        // If watcher exists, update which fields it watches
        else {
            this.focusWatcher.updateFields(fieldSelectors);
        }
    }
    // If substep doesn't need watching but watcher exists, destroy it
    else if (this.focusWatcher) {
        this.stopFocusWatcher();
    }
}

/**
 * Start watching for field disengagement
 */
startFocusWatcher(fieldSelectors) {
    this.focusWatcher = new FocusToActionsWatcher({
        fieldSelectors: fieldSelectors, // Array of CSS selectors
        actionsSelector: '.form-btns', // The button area
        onDisengage: (fieldElements) => {
            // When fields scroll away but buttons are visible, invalidate context
            // This will cause tutorial to re-evaluate and potentially show publish substep
            this.invalidateContext();
            this.updateTutorialForContext();
        }
    });
}

/**
 * Stop watching and clean up
 */
stopFocusWatcher() {
    if (this.focusWatcher) {
        this.focusWatcher.destroy();
        this.focusWatcher = null;
    }
}
```

### Step 5: Call manageFocusWatcher when tutorial updates
```javascript
updateTutorialDisplay() {
    // ... existing code ...
    
    // Manage focus watcher based on current substep
    this.manageFocusWatcher();
    
    // ... rest of existing code ...
}
```

### Step 6: Clean up when tutorial is hidden
```javascript
hideTutorial() {
    // ... existing code ...
    
    // Stop the watcher when tutorial is hidden
    this.stopFocusWatcher();
    
    // ... rest of existing code ...
}
```

## How to Use for Specific Fields Only

The watcher only activates when:
- Current substep has a `field` property
- That field is in the `watchedFields` array (title, prompt, or writing)

For example:
- ✅ Substep with `field: 'title'` → Watcher starts, watches title field
- ✅ Substep with `field: 'prompt'` → Watcher starts, watches prompt field (CKEditor)
- ✅ Substep with `field: 'writing'` → Watcher starts, watches writing field (CKEditor)
- ❌ Substep with `field: 'keywords'` → Watcher does NOT start
- ❌ Substep with no `field` property → Watcher does NOT start

## When Watcher is Active

The watcher is ONLY active when:
1. Tutorial is showing
2. Current substep has a watched field (title, prompt, or writing)
3. User is on a page with the form (create page)

When you navigate to a different substep:
- If new substep has a watched field → Watcher updates to watch new field(s)
- If new substep has no watched field → Watcher stops

## How It Triggers

The `onDisengage` callback is called when:
- **None** of the watched fields are visible (all scrolled out of view)
- **AND** the actions area (`.form-btns`) is visible
- This means: user has scrolled away from the field but can still see the buttons
