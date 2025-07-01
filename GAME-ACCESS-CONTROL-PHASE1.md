# Game Access Control - Phase 1 Implementation

## Overview
This phase implements the foundation for game access control by adding database fields, form controls, and backend logic for managing game visibility and joinability.

## Database Changes

### SQL Updates Required:
```sql
-- 1. Rename open_for_writers to joinable_by_all for semantic clarity
ALTER TABLE game 
CHANGE COLUMN open_for_writers joinable_by_all TINYINT(1) DEFAULT 1;

-- 2. Add visible_to_all column to control game visibility
ALTER TABLE game 
ADD COLUMN visible_to_all TINYINT(1) DEFAULT 1 
AFTER joinable_by_all;

-- 3. Add visited_at column to game_invitation table (from previous fix)
ALTER TABLE game_invitation 
ADD COLUMN visited_at DATETIME NULL 
AFTER invited_at;
```

## Model Updates

### Game.php
- ✅ Updated `$fillable` array to include `joinable_by_all` and `visible_to_all`
- ✅ Removed `open_for_writers` from fillable fields

### GameInvitation.php
- ✅ Added `visited_at` to `$fillable` array

## Controller Updates

### ControllerGame.php
- ✅ Updated `createGame()` method to save access control settings
- ✅ Added default values: both `visible_to_all` and `joinable_by_all` default to `1` (open access)

### ControllerGameInvitation.php
- ✅ Renamed `accept()` method to `visit()`
- ✅ Updated URL generation from `GameInvitation/accept/` to `GameInvitation/visit/`
- ✅ Added `visited_at` timestamp tracking
- ✅ Added `checkInvitationAccess()` method for permission checking

## Frontend Updates

### View: text-create.php
- ✅ Added minimal access control section for root texts
- ✅ Side-by-side toggle layout (stacks on mobile)
- ✅ Compact toggle switches with clean design
- ✅ User-friendly minimal labels

### Internationalization
- ✅ Added `game_settings` section to both `en.json` and `fr.json`
- ✅ Translations for all access control labels and descriptions

### CSS
- ✅ Created `assets/css/elements/access-control.css`
- ✅ Added import to `main.css`
- ✅ Minimal, responsive side-by-side layout
- ✅ Compact toggle switches with subtle animations

## Access Control Options

### Visibility Settings
1. **Visible to everyone** (`visible_to_all = 1`)
   - Anyone can see this collaboration in lists and searches
2. **Visible only to invited people** (`visible_to_all = 0`)
   - Only invited collaborators can see this collaboration

### Join Settings  
1. **Anyone can join** (`joinable_by_all = 1`)
   - Anyone can contribute to this collaboration
2. **Invitation required to join** (`joinable_by_all = 0`)
   - Only invited people can contribute to this collaboration

## Form Data Flow
1. User creates game with access settings in form
2. Form data sent to `ControllerText::store()`
3. Calls `ControllerGame::createGame()` with form data
4. Game created with proper access control values

## Next Steps (Phase 2)
1. **Permission Integration**: Update game retrieval queries to respect access settings
2. **Game List Filtering**: Modify `Game::getGames()` to filter based on permissions  
3. **Text Controller Updates**: Add permission checks to `ControllerText::collab()`
4. **Invitation System Integration**: Use `checkInvitationAccess()` in permission logic

## Benefits Achieved
- ✅ **Foundation Ready**: Database and forms ready for access control
- ✅ **User-Friendly**: Clean, minimal side-by-side toggle layout
- ✅ **Internationalized**: Support for English and French
- ✅ **Extensible**: Clean architecture for adding permission checks
- ✅ **Backward Compatible**: Defaults maintain existing behavior

## Testing Checklist
- [ ] Run SQL updates on database
- [ ] Test game creation form with new access controls
- [ ] Verify default values work correctly
- [ ] Test invitation visit flow still works
- [ ] Check internationalization displays correctly 