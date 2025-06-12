# User-Centric Activity Tracking System

This document describes the **User-Centric Activity Tracking System** - a paradigm shift from backend-aggregated activity data to frontend-derived analytics based on individual user activities.

## Table of Contents

1. [Overview](#overview)
2. [Architectural Shift](#architectural-shift)
3. [Core Architecture](#core-architecture)
4. [Data Flow](#data-flow)
5. [UserActivityDataManager](#useractivitydatamanager)
6. [Activity Derivation](#activity-derivation)
7. [Event System](#event-system)
8. [Implementation Status](#implementation-status)
9. [Integration Guide](#integration-guide)
10. [Debugging & Diagnostics](#debugging--diagnostics)

## Overview

The User-Centric Activity Tracking System solves the "missing game close" problem and provides more accurate, real-time activity analytics by tracking individual user states and deriving aggregated activities on the frontend.

### Key Benefits

- **Explicit State Changes**: User activities are tracked explicitly, eliminating ambiguity about user context
- **Frontend Derivation**: Site-wide, game-level, and text-level activities are computed from user data
- **Real-Time Accuracy**: Immediate updates when users change contexts or activities
- **Automatic Cleanup**: Stale user states are automatically removed
- **Redis Optimization**: Backend can use Redis instead of database queries for user state

## Architectural Shift

### Previous System (Backend-Aggregated)
```
Backend Database → Aggregated Counts → Frontend Display
     ↓
[Site: 5 browsing, 3 writing]
[Game 123: 2 browsing, 1 writing]  
[Text 456: User 789 editing]
```

**Problems with Previous System:**
- Backend pre-aggregated activity counts
- Frontend couldn't track user state changes accurately
- "Missing game close" - users leaving games weren't properly tracked
- UI updates were delayed or incorrect

### New System (User-Centric)
```
User Activities → Frontend Processing → Derived Analytics
     ↓
Individual User States:
- User 40: browsing game 7
- User 41: writing text 123 in game 7
- User 42: idle in game 8

Derived Activities:
- Site: 2 active (1 browsing, 1 writing)
- Game 7: 2 users (1 browsing, 1 writing)
- Text 123: User 41 iterating
```

**Benefits of New System:**
- Individual user states are the source of truth
- Frontend derives all aggregate activities
- Real-time accuracy with immediate state changes
- Automatic cleanup handles disconnections

## Core Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    User-Centric Activity System                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────────────────────────┐ │
│  │ CurrentActivity │    │     UserActivityDataManager         │ │
│  │    Manager      │    │                                      │ │
│  │                 │    │  ┌─────────────┐ ┌─────────────────┐ │ │
│  │ • Heartbeats    │───▶│  │ User Data   │ │ Derived Data    │ │ │
│  │ • Local State   │    │  │             │ │                 │ │ │
│  │ • Context       │    │  │ Map<userId, │ │ • Game Activity │ │ │
│  │                 │    │  │ activity>   │ │ • Text Activity │ │ │
│  └─────────────────┘    │  │             │ │ • Site Activity │ │ │
│                         │  └─────────────┘ └─────────────────┘ │ │
│                         └──────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                           Event Bus                             │
│  gameActivityChanged • textActivityChanged • siteActivityUpdate │
├─────────────────────────────────────────────────────────────────┤
│                        UI Components                            │
│        Shelf View • Modal View • Tree View • Status Bar        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Sources

1. **SSE Events**: Real-time user activity updates from other users
2. **Local Heartbeats**: Current user's own activity changes
3. **Database Initialization**: Active users loaded on page load

### Activity Types

- **browsing**: Viewing content, navigating games
- **iterating**: Editing/writing story text
- **adding_note**: Adding notes to texts
- **starting_game**: Creating new games

### Activity Levels

- **active**: User is currently engaged
- **idle**: User is inactive but still connected

## Data Flow

### 1. User Activity Input

```javascript
// User Activity Data Structure
{
    writer_id: "41",
    activity_type: "iterating",        // browsing, iterating, adding_note, starting_game
    activity_level: "active",          // active, idle
    page_type: "game_list",            // game_list, text_form, collab_page, home, other
    game_id: "7",                      // Current game context
    text_id: "123",                    // Current text context (if editing)
    parent_id: "456",                  // Parent text (if applicable)
    timestamp: 1749674121
}
```

### 2. Change Detection

The system detects several types of changes:

- **Game Changes**: User joins/leaves games
- **Activity Level Changes**: User becomes active/idle
- **Activity Type Changes**: User switches between browsing/writing
- **Text Editing Changes**: User starts/stops/switches text editing

### 3. Activity Derivation

From individual user states, the system derives:

#### Site-Wide Activity
```javascript
{
    browsing: 1,    // Count of users browsing
    writing: 1,     // Count of users writing
    total: 2,       // Total active users
    lastUpdated: 1749674121109
}
```

#### Game-Level Activity
```javascript
{
    game_id: "7",
    browsing: 1,    // Users browsing this game
    writing: 1,     // Users writing in this game
    timestamp: 1749674121
}
```

#### Text-Level Activity
```javascript
{
    text_id: "123",
    activity_type: "iterating",  // Type of editing (or null)
    parent_id: "456",
    user_id: "41",              // Who is editing (or null)
    timestamp: 1749674121
}
```

## UserActivityDataManager

The `UserActivityDataManager` is the core component that manages user-centric tracking.

### Key Features

- **Singleton Pattern**: Ensures single instance across application
- **User State Management**: Maintains Map of user activities
- **Change Detection**: Identifies what changed between user states
- **Activity Derivation**: Computes site/game/text activities from user data
- **Automatic Cleanup**: Removes stale users after 10 minutes
- **Event Emission**: Publishes derived activities to event bus

### Configuration

```javascript
this.CONFIG = {
    CLEANUP_INTERVAL: 120000,      // 2 minutes (120 seconds)
    STALE_THRESHOLD: 600000,       // 10 minutes (600 seconds)  
    WRITING_TYPES: ['iterating', 'adding_note', 'starting_game'],
    TEXT_EDITING_TYPES: ['iterating', 'adding_note'], // Text-level editing activities
    ID_FIELDS: ['writer_id', 'user_id', 'game_id', 'text_id', 'parent_id'],
    DEBUG: true  // Set to true to enable debug logging
};
```

### Data Structure

```javascript
// User data storage
this.userData = {
    users: new Map(),              // Map<writer_id, user_activity>
    lastUpdated: null
};

// Derived activities
this.derivedGameActivities = {
    data: [],                      // Array of game activity objects
    lastUpdated: null
};

this.derivedTextActivities = {
    data: [],                      // Array of text activity objects  
    lastUpdated: null
};

this.derivedSiteActivity = {
    browsing: 0,
    writing: 0,
    total: 0,
    lastUpdated: null
};
```

## Activity Derivation

### Change Detection Logic

The system detects user changes by comparing previous and current activity states:

#### Game Context Changes
```javascript
// User joins new game
if (currGameId !== prevGameId && currGameId && isActive) {
    changes.push({
        type: 'game_joined',
        gameId: currGameId,
        userId: writerId,
        activityType: 'browsing' // or 'writing'
    });
}
```

#### Text Editing Changes
```javascript
// User starts editing text
if (!isEditingText(previous) && isEditingText(current)) {
    changes.push({
        type: 'text_editing_started',
        gameId: current.game_id,
        textId: current.text_id,
        userId: current.writer_id,
        editingType: current.activity_type
    });
}
```

### Activity Computation

#### Site Activity
```javascript
recomputeSiteActivity() {
    let browsing = 0, writing = 0;
    
    this.userData.users.forEach((userActivity) => {
        if (userActivity.activity_level === 'active') {
            const category = this.getActivityCategory(userActivity.activity_type);
            if (category === 'browsing') browsing++;
            else if (category === 'writing') writing++;
        }
    });
    
    this.derivedSiteActivity = {
        browsing, writing, total: browsing + writing,
        lastUpdated: Date.now()
    };
}
```

#### Game Activity  
```javascript
computeGameActivity(gameId) {
    let browsing = 0, writing = 0;
    
    // Ensure gameId is consistently a string for comparison
    const normalizedGameId = String(gameId);
    
    this.userData.users.forEach((userActivity, userId) => {
        if (userActivity.game_id === normalizedGameId && userActivity.activity_level === 'active') {
            const category = this.getActivityCategory(userActivity.activity_type);
            if (category === 'browsing') browsing++;
            else if (category === 'writing') writing++;
        }
    });
    
    return { 
        game_id: normalizedGameId, 
        browsing, 
        writing, 
        timestamp: Math.floor(Date.now() / 1000) 
    };
}
```

#### Text Activity
```javascript
computeTextActivity(textId) {
    // Ensure textId is consistently a string for comparison
    const normalizedTextId = String(textId);
    
    // Find the user currently editing this text (only one can edit at a time)
    let currentEditor = null;
    this.userData.users.forEach((userActivity, userId) => {
        if (this.isEditingText(userActivity) && userActivity.text_id === normalizedTextId) {
            currentEditor = userActivity;
        }
    });
    
    return {
        text_id: normalizedTextId,
        activity_type: currentEditor?.activity_type || null,
        parent_id: currentEditor?.parent_id || null,
        user_id: currentEditor?.writer_id || null,
        timestamp: Math.floor(Date.now() / 1000)
    };
}
```

## Event System

### Event Bus Integration

The system publishes derived activities through the event bus:

```javascript
// Game activity changes
eventBus.emit('gameActivityChanged', {
    gameId: gameActivity.game_id,
    browsing: gameActivity.browsing,
    writing: gameActivity.writing,
    timestamp: gameActivity.timestamp,
    source: 'user-centric'
});

// Text activity changes  
eventBus.emit('textActivityChanged', {
    textId: textId,
    activity_type: textActivity?.activity_type || null,
    parent_id: textActivity?.parent_id || null,
    user_id: textActivity?.user_id || null,
    timestamp: textActivity?.timestamp || Math.floor(Date.now() / 1000),
    source: 'user-centric',
    changes: textChangeList.map(c => ({ type: c.type, editingType: c.editingType }))
});

// Site-wide activity changes
eventBus.emit('siteActivityUpdate', {
    browsing: this.derivedSiteActivity.browsing,
    writing: this.derivedSiteActivity.writing,
    total: this.derivedSiteActivity.total,
    timestamp: Math.floor(Date.now() / 1000),
    source: 'user-centric'
});
```

### Event Listeners

UI components listen for these events:

```javascript
// Shelf activity indicators
eventBus.on('textActivityChanged', (data) => {
    if (data.source === 'user-centric') {
        this.updateTextActivityIndicators(data);
    }
});

// Game activity displays
eventBus.on('gameActivityChanged', (data) => {
    if (data.source === 'user-centric') {
        this.updateGameActivityDisplay(data);
    }
});
```

## Implementation Status

### ✅ **Completed Components**

1. **UserActivityDataManager Core**: Full implementation with change detection, activity derivation, and event emission
2. **SSE Integration**: Receives user activity updates from server
3. **Local Heartbeat Integration**: Processes current user's activity changes  
4. **Shelf View UI**: Text activity indicators in shelf view
5. **Database Initialization**: Loads active users on page startup
6. **Cleanup System**: Removes stale users automatically

### 🚧 **In Progress**

1. **Modal View Integration**: Text activity indicators in modal view
2. **Tree View Integration**: Text activity indicators in D3 tree visualization

### 📋 **Todo**

1. **Backend Redis Integration**: Use Redis for user state instead of database queries
2. **Old System Removal**: Comment out/remove backend-aggregated activity system
3. **Performance Optimization**: Fine-tune cleanup intervals and thresholds
4. **Analytics Dashboard**: Admin interface for monitoring user activities

### 🔄 **Transition State**

Currently, both old and new systems coexist:
- **Old System**: Backend aggregates activity counts, sends to frontend
- **New System**: Backend sends user activities, frontend derives aggregates

The new system is designed to be compatible with existing event listeners while providing more accurate data.

## Integration Guide

### For UI Components

To integrate with the user-centric system:

1. **Listen for Events**:
```javascript
eventBus.on('textActivityChanged', (data) => {
    if (data.source === 'user-centric') {
        // Update UI based on text activity
        this.updateTextActivityIndicator(data.textId, data.activity_type, data.user_id);
    }
});
```

2. **Check Current State**:
```javascript
// Get current text activity
const textActivity = window.userActivityDataManager.getTextActivity(textId);
if (textActivity && textActivity.activity_type) {
    // Someone is editing this text
    this.showEditingIndicator(textActivity.user_id, textActivity.activity_type);
}
```

3. **Use Diagnostic Tools**:
```javascript
// Debug current system state
const diagnostic = window.userActivityDataManager.getDiagnosticInfo();
console.log('Active users:', diagnostic.activeUsers);
console.log('Site activity:', diagnostic.siteActivity);
```

### For Backend Developers

1. **Send User Activities**: Ensure SSE sends individual user activity objects via `userActivityUpdate` events
2. **Database Endpoint**: Provide `WriterActivity/getAllActiveUsers` endpoint for initialization  
3. **Redis Integration**: Store user activities in Redis for performance
4. **User Activity Format**: Ensure consistent field names (`writer_id`, `activity_type`, `activity_level`, `page_type`, `game_id`, `text_id`, `parent_id`, `timestamp`)

## Debugging & Diagnostics

### Global Diagnostic Function

```javascript
// Available globally for debugging
window.debugUserActivity()

// Returns comprehensive system state:
{
    totalUsers: 2,
    activeUsers: [
        {
            userId: '40',
            activity_level: 'active',
            activity_type: 'browsing',
            category: 'browsing',
            game_id: '7',
            lastSeen: '2:15:21 PM'
        }
    ],
    idleUsers: [],
    siteActivity: { browsing: 1, writing: 1, total: 2 },
    gameActivities: [{ game_id: '7', browsing: 1, writing: 1 }],
    textActivities: [{ text_id: '123', activity_type: 'iterating', user_id: '41' }]
}
```

### Console Commands

```javascript
// Get all user activities
window.userActivityDataManager.getUserActivities()

// Get derived game activities  
window.userActivityDataManager.getDerivedGameActivities()

// Get derived text activities
window.userActivityDataManager.getDerivedTextActivities()

// Get site-wide activity
window.userActivityDataManager.getSiteActivity()

// Get specific game activity
window.userActivityDataManager.getGameActivity('7')

// Get specific text activity
window.userActivityDataManager.getTextActivity('123')
```

### Troubleshooting

#### Empty Text Activities Array
**Symptom**: `getDerivedTextActivities()` returns empty array despite users editing
**Cause**: Initialization doesn't detect existing text editing states
**Solution**: The `detectUserChanges` method now checks for text editing during initialization

#### Duplicate Events
**Symptom**: Multiple events fired for single user action
**Cause**: Both old and new systems running simultaneously
**Solution**: Check event `source` property - use `'user-centric'` events only

#### Missing User States
**Symptom**: Users not appearing in diagnostic info
**Cause**: SSE not sending user activity updates or normalization issues
**Solution**: Check SSE connection and `normalizeUserActivityData` method

---

*This documentation reflects the current implementation of the User-Centric Activity Tracking System. As the system evolves and the old system is phased out, this document will be updated accordingly.* 