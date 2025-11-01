# Game Access Control System

## Overview
This document describes the complete game access control system that manages game visibility and joinability. The system allows game creators to control who can see and participate in collaborative games through database fields, form controls, and SQL-level permission filtering.

## Access Control Options

### Visibility Settings
1. **Visible to everyone** (`visible_to_all = 1`)
   - Anyone can see this collaboration in lists and searches
   - Default behavior for backward compatibility
2. **Visible only to invited people** (`visible_to_all = 0`)
   - Only invited collaborators can see this collaboration
   - Games are hidden from public lists and searches

### Join Settings  
1. **Anyone can join** (`joinable_by_all = 1`)
   - Anyone who can see the game can contribute to it
   - Default behavior for backward compatibility
2. **Invitation required to join** (`joinable_by_all = 0`)
   - Only invited people can contribute to this collaboration
   - Users who can see the game but aren't invited cannot contribute

## Database Schema

### Game Table
```sql
-- Column: visible_to_all (TINYINT(1) DEFAULT 1)
-- Controls game visibility in lists and searches

-- Column: joinable_by_all (TINYINT(1) DEFAULT 1) 
-- Previously: open_for_writers (renamed for semantic clarity)
-- Controls whether invitation is required to contribute
```

### Game Invitation Table
```sql
-- Column: visited_at (DATETIME NULL)
-- Tracks when an invitation link was visited
```

## Permission Filtering (SQL-Level)

The core access control is implemented at the SQL level in `Game::getGames()`. This ensures that unauthorized games never appear in query results.

### Access Logic in `Game::getGames()`

The method filters games based on:

1. **Token-based access** (lines 23-35)
   - Extracts valid invitation tokens from session
   - Removes expired tokens automatically
   - Tokens stored when user visits invitation link

2. **SQL WHERE clause filtering** (lines 192-206)
   ```sql
   WHERE 1=1 
   AND (
      g.visible_to_all = 1  -- Visible to everyone
      OR (
         g.visible_to_all = 0 AND (
            -- User is a player in this game (game_has_player table)
            (:loggedInWriterId != '' AND EXISTS (
               SELECT 1 FROM game_has_player ghp2 
               WHERE ghp2.game_id = g.id 
               AND ghp2.player_id = :loggedInWriterId
            ))
            OR 
            -- User has an invitation for this game (by user ID)
            (:loggedInWriterId != '' AND EXISTS (
               SELECT 1 FROM game_invitation gi 
               WHERE gi.game_id = g.id 
               AND gi.invitee_id = :loggedInWriterId 
               AND gi.status IN ('pending', 'accepted')
            ))
            OR
            -- User has a token for this game (by token)
            (EXISTS (
               SELECT 1 FROM game_invitation gi 
               WHERE gi.game_id = g.id 
               AND gi.token IN (:tokens) 
               AND gi.status IN ('pending', 'accepted')
            ))
         )
      )
   )
   ```

### How It Works

1. **If `visible_to_all = 1`**: Game is returned (visible to everyone)
2. **If `visible_to_all = 0`**: Game is only returned if user:
   - Is a player in the game (exists in `game_has_player` table), OR
   - Has an invitation by user ID (`invitee_id` matches logged-in user), OR
   - Has a valid invitation token in session

This SQL-level filtering ensures that:
- Unauthorized games never appear in results
- Permission checks happen at the database level (most secure)
- No additional permission checks needed after query returns

## Implementation Details

### Models

#### Game.php
- ✅ `$fillable` includes `joinable_by_all` and `visible_to_all`
- ✅ `getGames()` method implements SQL-level permission filtering
- ✅ `getModifiedSince()` uses same permission filtering for updates

#### GameInvitation.php
- ✅ `$fillable` includes `visited_at`
- ✅ `hasInvitationByUserId()` - checks invitation by user ID
- ✅ `isTokenValidForGame()` - validates token for specific game

### Controllers

#### ControllerGame.php
- ✅ `createGame()` saves access control settings
- ✅ Default values: both `visible_to_all` and `joinable_by_all` default to `1` (open access)

#### ControllerGameInvitation.php
- ✅ `visit()` method handles invitation link access
   - Stores token in session with expiration (2 hours)
   - Updates `visited_at` timestamp
   - Redirects to game collaboration page
- ✅ `checkInvitationAccess()` - static method to check if user has invitation access
   - Checks user ID-based invitations
   - Checks token-based invitations (from session)
   - Validates token expiration
- ✅ `processLoggedInInvitation()` - links email invitations to logged-in users

#### ControllerText.php
- ✅ `collab()` method uses `Game::getGames()` which automatically filters by permissions
   - If `getGames()` returns empty, user doesn't have access
   - No additional permission checks needed (handled at SQL level)

### Frontend

#### View: text-create.php
- ✅ Access control section for root texts
- ✅ Side-by-side toggle layout (stacks on mobile)
- ✅ Compact toggle switches with clean design
- ✅ User-friendly labels

#### Internationalization
- ✅ `game_settings` section in `en.json` and `fr.json`
- ✅ Translations for all access control labels and descriptions

#### CSS
- ✅ `assets/css/elements/access-control.css`
- ✅ Imported in `main.css`
- ✅ Responsive side-by-side layout
- ✅ Compact toggle switches with subtle animations

## Form Data Flow

1. User creates game with access settings in form
2. Form data sent to `ControllerText::store()`
3. Calls `ControllerGame::createGame()` with form data
4. Game created with proper access control values (`visible_to_all`, `joinable_by_all`)
5. When game is retrieved, `Game::getGames()` filters based on these values

## Permission Library

The `library/Permissions.php` class provides helper methods for permission checking:

- `hasGameAccess()` - Checks if user can see/access the game
- `canJoinGame()` - Checks if user can contribute to the game
- `aggregatePermissions()` - Adds permission flags to data for frontend use

These methods are used by the `PermissionsService` to add permission flags to game data, but the actual access control happens at the SQL level in `getGames()`.

## Invitation System Integration

The invitation system works seamlessly with access control:

1. **Email invitations**: When a user is invited by email
   - Invitation stored in `game_invitation` table
   - Token generated and sent via email
   - User visits link → token stored in session
   - Token grants access even before user creates account

2. **User ID invitations**: When a registered user is invited
   - Invitation linked directly to user ID
   - Access granted immediately (no token needed)

3. **Token-based access**:
   - Tokens stored in `$_SESSION['game_invitation_access']`
   - Tokens expire after 2 hours
   - Expired tokens automatically removed
   - Valid tokens allow access to private games

## Benefits

- ✅ **SQL-Level Security**: Permission filtering happens at database level
- ✅ **No Redundant Checks**: Single source of truth in `getGames()` method
- ✅ **Backward Compatible**: Defaults maintain existing open access behavior
- ✅ **User-Friendly**: Clean, minimal side-by-side toggle layout
- ✅ **Internationalized**: Support for English and French
- ✅ **Token Support**: Handles both logged-in and anonymous user invitations
- ✅ **Extensible**: Clean architecture for future enhancements

## Testing Checklist

- [x] SQL updates applied to database
- [x] Game creation form includes access controls
- [x] Default values work correctly (open access by default)
- [x] Invitation visit flow works (token storage)
- [x] Internationalization displays correctly
- [x] `getGames()` filters private games correctly
- [x] Token-based access works for anonymous users
- [x] User ID-based invitations work for registered users
- [x] Expired tokens are removed automatically
- [x] Games with `visible_to_all = 0` hidden from unauthorized users

