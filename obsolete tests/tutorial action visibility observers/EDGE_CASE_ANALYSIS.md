# Edge Case Analysis: Everything Visible

## Scenario: Whole Page Visible (Fields + Buttons)

Let's trace through what happens with the current proposed conditions:

### Current Conditions (from SIMPLE_VISIBILITY_APPROACH.md)

```javascript
// General info
showWhen: 'page === "create" && !canPublish && !anyFieldFocused && !buttonsVisible'

// Title substep
showWhen: 'page === "create" && !canPublish && fieldFocused.title && (fieldVisible.title || !buttonsVisible)'

// Publish substep
showWhen: 'page === "create" && (canPublish || (buttonsVisible && anyFieldFocused && !anyFieldFocusedAndVisible))'
```

## Edge Case 1: User Arrives on Page

**State:**
- `page = "create"`
- `canPublish = false`
- `anyFieldFocused = false` (nothing focused)
- `buttonsVisible = true` (buttons visible)
- `fieldVisible.title = true` (everything visible)

**Evaluation:**
- General: `!canPublish && !anyFieldFocused && !buttonsVisible` = `true && true && false` = **false** ❌
- Title: `fieldFocused.title && (fieldVisible.title || !buttonsVisible)` = `false && ...` = **false** ❌
- Publish: `canPublish || (buttonsVisible && anyFieldFocused && !anyFieldFocusedAndVisible)` = `false || (true && false && ...)` = **false** ❌

**Problem**: Nothing matches! User sees... nothing? Or stays on current substep?

## Edge Case 2: User Focuses Title Field

**State:**
- `fieldFocused.title = true`
- `fieldVisible.title = true`
- `buttonsVisible = true`
- `fieldFocusedAndVisible.title = true`

**Evaluation:**
- General: `!anyFieldFocused && !buttonsVisible` = `false && false` = **false** ❌
- Title: `fieldFocused.title && (fieldVisible.title || !buttonsVisible)` = `true && (true || false)` = **true** ✅
- Publish: `canPublish || (buttonsVisible && anyFieldFocused && !anyFieldFocusedAndVisible)` = `false || (true && true && false)` = **false** ❌

**Result**: Title substep matches ✅ (correct!)

## Edge Case 3: Title Field Loses Focus

**State:**
- `fieldFocused.title = false`
- `fieldVisible.title = true` (still visible)
- `buttonsVisible = true`
- `anyFieldFocused = false`

**Evaluation:**
- General: `!anyFieldFocused && !buttonsVisible` = `true && false` = **false** ❌
- Title: `fieldFocused.title && ...` = `false && ...` = **false** ❌
- Publish: `canPublish || (buttonsVisible && anyFieldFocused && !anyFieldFocusedAndVisible)` = `false || (true && false && ...)` = **false** ❌

**Problem**: Nothing matches again!

## Edge Case 4: User Navigates via Tutorial Arrows

**State:**
- User manually navigates to a substep
- `currentSubstep` is set manually
- Conditions are evaluated, but manual navigation might override

**Question**: Does manual navigation bypass condition evaluation?

Looking at code: `goToSubstep()` calls `updateTutorialDisplay()` but doesn't re-evaluate conditions. So manual navigation should work, but then what happens on next automatic evaluation?

## Problems Identified

1. **Nothing matches when**: No field focused + buttons visible + form not valid
2. **Nothing matches when**: Field loses focus + buttons visible + form not valid

## Proposed Solutions

### Solution A: Make General Info More Permissive

```javascript
{
    text: 'tutorial.start-game.steps.write.substeps.create',
    showWhen: 'page === "create" && !canPublish && !anyFieldFocused',
    // Remove !buttonsVisible requirement
    // Show when no field focused, regardless of button visibility
}
```

**Pros**: Simple, handles edge case 1
**Cons**: Might show general info when buttons are visible (is that desired?)

### Solution B: Make Publish More Permissive

```javascript
{
    text: 'tutorial.start-game.steps.write.substeps.publish',
    showWhen: 'page === "create" && (canPublish || buttonsVisible)',
    // Show if buttons visible, even without field focused
}
```

**Pros**: Makes sense - if buttons visible, show publish info
**Cons**: Might show publish too early (before user has filled form)

### Solution C: Priority-Based Fallback

Keep conditions strict, but add fallback logic:
- If nothing matches, show general info (lowest priority)
- Or show publish if buttons visible (higher priority)

### Solution D: Revised Conditions

```javascript
// General info: only when nothing else applies AND buttons not visible
showWhen: 'page === "create" && !canPublish && !anyFieldFocused && !buttonsVisible'

// Field substeps: when focused AND (visible OR buttons not visible)
showWhen: 'page === "create" && !canPublish && fieldFocused.title && (fieldVisible.title || !buttonsVisible)'

// Publish: when form valid OR (buttons visible AND no field focused+visible)
// BUT also: if buttons visible AND no field focused (even if not scrolled away)
showWhen: 'page === "create" && (canPublish || buttonsVisible && (!anyFieldFocused || (anyFieldFocused && !anyFieldFocusedAndVisible)))'
```

This means publish shows if:
- Form is valid, OR
- Buttons visible AND (no field focused OR field focused but scrolled away)

## Recommended Approach

**Revised Publish Condition**:

```javascript
// Publish substep
showWhen: 'page === "create" && (canPublish || (buttonsVisible && !anyFieldFocusedAndVisible))'
```

This means:
- Show publish if form valid, OR
- Show publish if buttons visible AND no field is both focused AND visible

**This handles**:
- ✅ Buttons visible, no field focused → publish (anyFieldFocusedAndVisible = false)
- ✅ Buttons visible, field focused but scrolled away → publish (anyFieldFocusedAndVisible = false)
- ✅ Buttons visible, field focused and visible → field substep (higher priority, matches first)
- ✅ Buttons not visible, no field focused → general info

## Edge Case Solutions

### Edge Case 1: User Arrives, Everything Visible
- `anyFieldFocused = false`
- `buttonsVisible = true`
- `anyFieldFocusedAndVisible = false`
- **Result**: Publish matches ✅ (because `buttonsVisible && !anyFieldFocusedAndVisible`)

### Edge Case 2: User Focuses Title
- `fieldFocused.title = true`
- `fieldVisible.title = true`
- `anyFieldFocusedAndVisible = true`
- **Result**: Title substep matches ✅ (first in array, higher priority)

### Edge Case 3: Title Loses Focus, Everything Visible
- `fieldFocused.title = false`
- `anyFieldFocused = false`
- `buttonsVisible = true`
- `anyFieldFocusedAndVisible = false`
- **Result**: Publish matches ✅ (because `buttonsVisible && !anyFieldFocusedAndVisible`)

### Edge Case 4: Manual Navigation
- User clicks arrow to go to title substep
- `goToSubstep()` sets `currentSubstep = 1` manually
- Next evaluation: if title focused+visible → stays on title ✅
- Next evaluation: if title not focused → switches to publish ✅
- **Result**: Manual navigation works, but gets overridden by conditions (which is correct behavior)

## Questions to Answer

1. **When user arrives, buttons visible, nothing focused**: 
   - **Answer**: Show publish ✅ (makes sense - buttons are visible, ready to publish)

2. **When field loses focus, buttons visible**: 
   - **Answer**: Show publish ✅ (user moved away from field, buttons visible)

3. **Manual navigation**: 
   - **Answer**: Should be overridden by conditions ✅ (automatic behavior takes priority)

## Suggested Logic Flow

**Priority order** (first matching wins):
1. **Field substeps**: `fieldFocused && (fieldVisible || !buttonsVisible)`
   - Highest priority: if field focused, show its substep (unless scrolled away AND buttons visible)
2. **Publish**: `canPublish || (buttonsVisible && !anyFieldFocusedAndVisible)`
   - Show if form valid OR (buttons visible AND no field focused+visible)
3. **General info**: `!anyFieldFocused && !buttonsVisible`
   - Fallback: only when no field focused AND buttons not visible

This ensures something always matches when on create page.
