# Activity Tracking System Documentation

This document provides comprehensive information about the user activity tracking and analytics system in the Tag You Write application.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Activity Context](#activity-context)
5. [Heartbeat System](#heartbeat-system)
6. [Idle Detection](#idle-detection)
7. [Event Integration](#event-integration)
8. [Backend Integration](#backend-integration)
9. [Performance Considerations](#performance-considerations)
10. [Usage Examples](#usage-examples)
11. [Troubleshooting](#troubleshooting)

## Overview

The Activity Tracking System monitors user engagement and provides analytics for collaborative writing sessions. It uses a sophisticated dual-detection approach to accurately track user activity states while maintaining optimal performance.

### Key Features

- **Dual Idle Detection**: Timer-based and engagement-based systems working in parallel
- **Context-Aware Tracking**: Monitors page type, activity type, game context, and text focus
- **Intelligent Heartbeats**: Activity-based heartbeat system with automatic idle detection
- **Engagement Metrics**: Mouse, keyboard, scroll, and click interaction tracking
- **Event-Driven Updates**: Integration with the application's event bus system
- **Performance Optimized**: Minimal network requests and efficient resource usage

## Architecture

The activity tracking system uses a dual-detection approach for accurate user state monitoring:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User Actions   │────▶│  Activity       │────▶│  Heartbeat      │
│  (mouse, keys,  │     │  Manager        │     │  System         │
│   scroll, etc.) │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                         │
                                ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Engagement     │     │  Idle Detection │     │  Server         │
│  Metrics        │     │  (Dual System)  │     │  Analytics      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Three-Phase Initialization

1. **Phase 1: Page/Activity Type Detection**
   - Determines what kind of page the user is on
   - Identifies the type of activity being performed
   - Drives context extraction strategy

2. **Phase 2: Context ID Extraction**
   - Extracts relevant game_id, text_id, and parent_id from DOM
   - Different strategies based on page type
   - Establishes initial tracking context

3. **Phase 3: Event Setup and Tracking Start**
   - Sets up all event listeners
   - Starts heartbeat and idle detection systems
   - Begins activity monitoring

## Core Components

### CurrentActivityManager

**File**: `assets/js/currentActivityManager.js`

The main class that orchestrates all activity tracking functionality.

#### Key Properties

```javascript
{
  // Core activity state
  currentActivity: {
    page_type: null,        // Type of page (game_list, text_form, etc.)
    activity_type: null,    // Type of activity (browsing, editing, etc.)
    game_id: null,          // Current game being viewed
    text_id: null,          // Current text being viewed/edited
    parent_id: null,        // Parent text ID (for form contexts)
    activity_level: 'active' // Current activity level (active/idle)
  },

  // System configuration
  heartbeatInterval: 30000,  // 30 seconds between heartbeats
  idleTimeout: 29000,        // 29 seconds (1s buffer before heartbeat timer)
  
  // State tracking
  isInitializing: true,      // Prevents premature heartbeats
  hasActivitySinceLastHeartbeat: false,
  isCurrentlyIdle: false,
  lastActivity: Date.now(),
  
  // Engagement metrics
  engagementMetrics: {
    mouseMovements: 0,
    keystrokes: 0,
    scrolls: 0,
    clicks: 0,
    lastReset: Date.now()
  }
}
```

#### Singleton Pattern

The manager uses a singleton pattern to ensure only one instance exists across the application:

```javascript
if (window.currentActivityManagerInstance) {
    return window.currentActivityManagerInstance;
}
window.currentActivityManagerInstance = this;
```

### Shelf Node Management

The system tracks open story nodes in a "most recent first" array:

```javascript
// Add node to tracking
addToShelfNodes(textId)

// Remove node from tracking
removeFromShelfNodes(textId)

// Get most recent node
getLastShelfNode()

// Clear all nodes (when changing games)
clearShelfNodes()
```

## Activity Context

### Page Types

- **`game_list`**: Main collaboration pages where users browse and interact with games
- **`text_form`**: Text editing/creation forms for writing content
- **`collab_page`**: Collaboration-specific pages for team interactions
- **`home`**: Homepage and landing pages
- **`other`**: Miscellaneous pages not fitting other categories

### Activity Types

- **`browsing`**: Viewing and navigating content, exploring games and texts
- **`editing`**: Creating or modifying text content
- **`starting_game`**: Initiating new collaborative writing sessions

### Context Extraction Strategies

#### Game List/Collaboration Pages
```javascript
extractGamePageContext(rootStoryId) {
    // Extract game_id from the game element
    this.extractGameId(rootStoryId);
    
    // Extract text_id from modal or shelf nodes
    this.extractTextId(rootStoryId);
}
```

#### Form Pages
```javascript
extractFormPageContext() {
    const form = document.querySelector('[data-form-type]');
    this.currentActivity.game_id = form.querySelector('input[name="game_id"]')?.value;
    this.currentActivity.text_id = form.querySelector('input[name="id"]')?.value;
    this.currentActivity.parent_id = form.querySelector('input[name="parent_id"]')?.value;
}
```

## Heartbeat System

### Activity-Based Heartbeats

Triggered by user interactions and context changes:

- **Immediate Response**: Heartbeats sent on inflection points
- **Context Changes**: Modal open/close, text focus changes, game switches
- **Single Heartbeat Coordination**: Setter methods prevent multiple heartbeats

### Timer-Based Heartbeats

Regular heartbeats during active periods:

- **30-Second Intervals**: Consistent monitoring during active use
- **Automatic Cessation**: Stops during idle periods to reduce server load
- **Engagement-Based Decisions**: Activity level determined by user engagement

### Inflection Points

Key events that trigger immediate heartbeats:

1. **Modal Interactions**
   - `modalOpened`: User opens a text for viewing
   - `modalClosed`: User closes text modal

2. **Shelf Node Operations**
   - `shelfNodeOpened`: User opens a story node
   - `shelfNodeClosed`: User closes a story node

3. **Game Context Changes**
   - `sseParametersChanged`: User switches between games
   - `showcaseTypeChanged`: User changes view mode

4. **Page Navigation**
   - `beforeunload`: User leaves the page

### Heartbeat Coordination

To prevent multiple heartbeats during complex operations:

```javascript
// Use setters with triggerHeartbeat=false for all but the last change
this.setTextId(textId, false);
this.setActivityLevel('active', false);
this.markUserActivity('modalOpened');
// Send single heartbeat after all changes
this.sendHeartbeatAndResetTimer();
```

## Idle Detection

### Dual System Architecture

The system uses two complementary idle detection mechanisms:

#### 1. Timer-Based Detection (Heartbeat System)
- **Interval**: 30 seconds
- **Purpose**: Regular activity monitoring
- **Trigger**: Lack of activity flags between heartbeats

#### 2. Engagement-Based Detection (Idle Timer)
- **Timeout**: 29 seconds (1-second buffer)
- **Purpose**: Immediate idle detection
- **Trigger**: Combination of time and engagement scoring

### Race Condition Prevention

The 1-second buffer ensures the idle timer always fires before the heartbeat timer, preventing race conditions:

```javascript
this.heartbeatInterval = 30000; // 30 seconds
this.idleTimeout = 29000;       // 29 seconds (1s buffer)
```

### Engagement Scoring

The system calculates an engagement score based on user interactions:

```javascript
const engagementScore = this.engagementMetrics.mouseMovements + 
                       this.engagementMetrics.keystrokes + 
                       this.engagementMetrics.scrolls + 
                       this.engagementMetrics.clicks;

// Only mark as idle if engagement score is low (< 5 interactions)
if (timeSinceActivity >= this.idleTimeout && engagementScore < 5) {
    this.setActivityLevel('idle');
}
```

### Intelligent Recovery

When user activity resumes after idle period:

```javascript
if (this.isCurrentlyIdle) {
    this.isCurrentlyIdle = false;
    this.setActivityLevel('active', false);
    // Send immediate "back to active" heartbeat
    this.sendHeartbeatAndResetTimer();
}
```

## Event Integration

### Event Bus Integration

The activity manager integrates seamlessly with the application's event bus:

```javascript
// Modal interactions
eventBus.on('modalOpened', (textId) => {
    this.setTextId(textId, false);
    this.setActivityLevel('active', false);
    this.markUserActivity('modalOpened');
    this.sendHeartbeatAndResetTimer();
});

// Game context changes
eventBus.on('sseParametersChanged', (params) => {
    if (params.type === 'rootStoryId') {
        this.extractGameId(params.value);
        this.clearShelfNodes();
        this.setTextId(null, false);
        this.setActivityLevel('active', false);
        this.markUserActivity('sseParametersChanged');
        this.sendHeartbeatAndResetTimer();
    }
});
```

### Activity Level Events

The system emits events for UI updates:

```javascript
// Emitted when activity level changes
eventBus.emit('activityLevelChanged', {
    level: level,
    timestamp: Date.now()
});

// Emitted after successful heartbeat
eventBus.emit('activityHeartbeat', {
    activity: this.currentActivity,
    timestamp: Date.now()
});
```

## Backend Integration

### Controller: ControllerWriterActivity

Handles all activity tracking requests:

- **Endpoint**: `writerActivity/storeOrUpdate`
- **Method**: POST
- **Purpose**: Store or update user activity records

### Model: WriterActivity

Manages database operations:

- **Database Operations**: CRUD operations for activity records
- **State Persistence**: Maintains activity history
- **Analytics Support**: Provides data for reporting

### Database Schema

```sql
CREATE TABLE writer_activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    writer_id INT NOT NULL,
    activity_type VARCHAR(50),
    activity_level VARCHAR(20),
    page_type VARCHAR(50),
    game_id INT,
    text_id INT,
    parent_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_writer_id (writer_id),
    INDEX idx_created_at (created_at),
    INDEX idx_activity_level (activity_level)
);
```

### Heartbeat Payload

```javascript
const payload = {
    writer_id: this.currentUserId,
    activity_type: this.currentActivity.activity_type,
    activity_level: this.currentActivity.activity_level,
    page_type: this.currentActivity.page_type,
    game_id: this.currentActivity.game_id,
    text_id: this.currentActivity.text_id,
    parent_id: this.currentActivity.parent_id
};
```

## Performance Considerations

### Efficient Event Handling

1. **Passive Event Listeners**
   ```javascript
   document.addEventListener('mousemove', () => this.handleMouseMove(), { passive: true });
   ```

2. **Debounced Engagement Tracking**
   - Engagement metrics updated on each interaction
   - Periodic reset every 5 minutes to prevent memory bloat

3. **Minimal DOM Queries**
   - Cached selectors where possible
   - Efficient context extraction strategies

### Network Optimization

1. **Batched Property Updates**
   ```javascript
   updateActivity({
       activity_type: 'editing',
       text_id: '123'
   }, true); // Single heartbeat for multiple changes
   ```

2. **Single Heartbeats per Inflection Point**
   - Coordinated setter methods
   - Prevents multiple network requests

3. **Automatic Idle State Management**
   - Stops heartbeats during idle periods
   - Reduces unnecessary server load

### Memory Management

1. **Singleton Pattern**
   - Prevents memory leaks from multiple instances
   - Ensures consistent state across application

2. **Proper Timer Cleanup**
   ```javascript
   stopTracking() {
       if (this.heartbeatTimer) {
           clearInterval(this.heartbeatTimer);
           this.heartbeatTimer = null;
       }
       if (this.idleTimer) {
           clearTimeout(this.idleTimer);
           this.idleTimer = null;
       }
   }
   ```

3. **Event Listener Management**
   - Proper cleanup on page unload
   - Passive listeners for performance

## Usage Examples

### Getting Current Activity State

```javascript
const activity = window.currentActivityManagerInstance.getCurrentActivity();
console.log('Current activity:', activity);
```

### Batch Updating Multiple Properties

```javascript
// Update multiple properties with single heartbeat
const hasChanges = window.currentActivityManagerInstance.updateActivity({
    activity_type: 'editing',
    text_id: '123',
    activity_level: 'active'
}, true); // Triggers heartbeat if changes were made
```

### Manual Activity Marking

```javascript
// Mark user activity manually (useful for custom events)
window.currentActivityManagerInstance.markUserActivity('custom_interaction');
```

### Checking System State

```javascript
const manager = window.currentActivityManagerInstance;
console.log('Is idle:', manager.isCurrentlyIdle);
console.log('Last activity:', new Date(manager.lastActivity));
console.log('Engagement metrics:', manager.engagementMetrics);
```

### Setting Individual Properties

```javascript
const manager = window.currentActivityManagerInstance;

// Set properties with automatic heartbeat
manager.setActivityType('editing');
manager.setTextId('456');
manager.setActivityLevel('active');

// Set properties without triggering heartbeat
manager.setActivityType('browsing', false);
manager.setTextId('789', false);
// Manually trigger heartbeat after all changes
manager.sendHeartbeatAndResetTimer();
```

## Troubleshooting

### Common Issues

#### 1. No Heartbeats Being Sent

**Symptoms**: No activity data appearing in database
**Possible Causes**:
- No user ID found in meta tag
- Network connectivity issues
- Server endpoint not responding

**Debugging**:
```javascript
// Check if user ID is detected
console.log('User ID:', window.currentActivityManagerInstance.currentUserId);

// Check for console errors
// Look for "CurrentActivityManager: No user ID found" warning
```

#### 2. Multiple Heartbeats on Single Action

**Symptoms**: Excessive network requests, duplicate database entries
**Possible Causes**:
- Direct property modification instead of using setters
- Not using `triggerHeartbeat=false` in batch operations

**Solution**:
```javascript
// Wrong - triggers multiple heartbeats
manager.setActivityType('editing');
manager.setTextId('123');
manager.setActivityLevel('active');

// Right - single heartbeat
manager.updateActivity({
    activity_type: 'editing',
    text_id: '123',
    activity_level: 'active'
});
```

#### 3. Idle Detection Not Working

**Symptoms**: User stays "active" even when not interacting
**Possible Causes**:
- Engagement metrics not being reset
- Timer conflicts
- Page visibility issues

**Debugging**:
```javascript
const manager = window.currentActivityManagerInstance;
console.log('Engagement score:', 
    manager.engagementMetrics.mouseMovements + 
    manager.engagementMetrics.keystrokes + 
    manager.engagementMetrics.scrolls + 
    manager.engagementMetrics.clicks
);
console.log('Time since last activity:', Date.now() - manager.lastActivity);
```

#### 4. Context Not Updating

**Symptoms**: Wrong game_id or text_id being tracked
**Possible Causes**:
- DOM elements not found during extraction
- Event listeners not properly set up
- Timing issues during page load

**Debugging**:
```javascript
// Check current context
console.log('Current activity:', manager.getCurrentActivity());

// Check DOM elements
console.log('Game element:', document.querySelector(`[data-text-id="${rootStoryId}"]`));
console.log('Modal element:', document.querySelector('[data-tree-modal="visible"]'));
```

### Performance Issues

#### High CPU Usage

**Possible Causes**:
- Too frequent event listeners
- Memory leaks from timers
- Excessive DOM queries

**Solutions**:
- Ensure passive event listeners are used
- Check for proper timer cleanup
- Monitor memory usage in browser dev tools

#### Network Overload

**Possible Causes**:
- Multiple heartbeats per action
- Heartbeats during idle periods
- Large payload sizes

**Solutions**:
- Use batch update methods
- Verify idle detection is working
- Check payload content for unnecessary data

### Debugging Tools

#### Console Logging

The system includes minimal logging for essential debugging:

```javascript
// Only logs when no user ID is found
if (!this.currentUserId) {
    console.warn('CurrentActivityManager: No user ID found - activity tracking disabled');
}

// Logs heartbeat failures
console.error('CurrentActivityManager: Heartbeat failed:', response.status, errorText);
```

#### Browser Developer Tools

1. **Network Tab**: Monitor heartbeat requests to `/writerActivity/storeOrUpdate`
2. **Console Tab**: Check for error messages and warnings
3. **Application Tab**: Verify localStorage data persistence
4. **Performance Tab**: Monitor timer usage and memory consumption

#### Database Monitoring

Check the `writer_activity` table for:
- Recent activity records
- Proper activity_level transitions (active ↔ idle)
- Correct context data (game_id, text_id, etc.)

This comprehensive system provides robust user activity tracking while maintaining optimal performance and user experience. 