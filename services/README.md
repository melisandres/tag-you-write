# Real-Time Update System Documentation

## Overview
The real-time update system tracks and broadcasts changes within the application using a three-tiered approach:

1. **Redis Pub/Sub** (Primary method)
2. **Server-Sent Events (SSE) Polling** (First fallback)  
3. **Frontend AJAX Polling** (Second fallback)

## Architecture

### Core Components
- `EventService`: Records actions in the database and broadcasts them
- `EventConfig`: Defines action types and their configurations
- `RedisManager`: Handles Redis connections and pub/sub operations
- `RedisService`: Broadcasts changes to appropriate Redis channels
- `DataFetchService`: Shared service for fetching current data state
- `events.php`: SSE handler that maintains real-time connections to browsers

### Terminology Clarification

**Important**: The term "event" is used for different concepts in this system:

1. **Database Events** - Records in the `events` table (action history)
2. **SSE Events** - Messages sent to browsers (`siteActivityUpdate`, `update`)
3. **Redis Messages** - Pub/sub notifications between servers
4. **Application Actions** - Things that happen (user votes, publishes text)

### Data Flow
1. **Action occurs** (vote, publish, activity change, etc.)
2. **EventService records it** with database entry containing:
   - `related_table` (game, text, notification, writer_activity)
   - `related_id` (specific record ID that changed)
   - `event_type` (descriptive label like 'text_voted', 'activity_updated')
3. **Redis broadcasting** (if available) publishes change notification
4. **Clients receive updates** through one of three delivery methods
5. **Fresh data fetching** using DataFetchService to get current state

## Real-Time Features

### 1. Content Updates (Votes, Publications, Notes)
- Text voting and publication changes
- Game state updates  
- Note additions and modifications
- Real-time collaborative editing indicators

### 2. Activity Tracking
- **User Presence**: Who's currently active on the site
- **Activity Types**: Browsing, writing, editing
- **Activity Levels**: Active vs idle detection
- **Context Awareness**: Which game/text users are viewing
- **Site-Wide Indicators**: Live user count displays

**Activity Flow:**
```
Frontend heartbeat (30s) → ControllerWriterActivity → EventService 
→ Redis: activities:site → SSE → ActivityIndicator → UI updates
```

### 3. Notifications
- User-specific notification delivery
- Real-time notification badges
- Contextual notification filtering

## How Updates Are Processed

### Key Concept: Table-Based Processing

**Important**: While action types (ROOT_PUBLISH, VOTE_TOGGLE, etc.) provide context about what happened, the system actually processes updates based on:

1. `related_table` - Which database table was affected
2. `related_id` - Which specific record to fetch fresh data for

This approach allows for efficient database queries and targeted updates.

### Processing Flow
1. **Action recorded** with related_table and related_id
2. **Change notification** sent through Redis or polling
3. **Fresh data query** for the specific related record using related_id  
4. **UI updates** with current state

## Update Delivery Methods

### 1. Redis Pub/Sub (Primary)
- Real-time updates through persistent connection
- Clients subscribe to specific channels:
  - `games:updates` - Game-related changes
  - `texts:{rootStoryId}` - Text changes for specific stories
  - `notifications:{writerId}` - User-specific notifications
  - `activities:site` - Site-wide activity tracking
- No polling or database queries except on initial connection

### 2. SSE Polling (First Fallback)
- Used when Redis is unavailable
- `DataFetchService` queries the events table for changes
- Selectively fetches related records only as needed
- Long-running connection with periodic polls
- Managed by `events.php`

### 3. Frontend Polling (Second Fallback)
- Used if SSE connection fails
- Regular AJAX calls to controller endpoints
- Uses the same `DataFetchService` as SSE
- Configurable polling intervals

## Adding a New Action Type

### Step 1: Define Action Configuration
Add your new action type to `EventConfig.php`:

```php
'NEW_ACTION_TYPE' => [
    'required_fields' => ['field1', 'field2'],
    'events' => [
        'target_table' => [
            'type' => 'descriptive_name',
            'table' => 'database_table',  // Important! Determines how change is processed
            'payload_fields' => ['field1', 'field2']
        ]
    ]
]
```

### Step 2: Record the Action
```php
$eventService = new EventService();
$eventService->createEvents('NEW_ACTION_TYPE', [
    'field1' => 'value1',
    'field2' => 'value2'
], ['action' => 'source_context', 'user_id' => $userId]);
```

## Action Types Reference

Current action types (primarily for logging and context):

- `ROOT_PUBLISH`: Root text published
- `CONTRIB_PUBLISH`: Contribution published  
- `NOTE_ADD`: Note added
- `VOTE_TOGGLE`: Vote added/removed
- `WINNING_VOTE`: Text won voting
- `GAME_CLOSED`: Game closed
- `NOTIFICATION_CREATED`: Notification created
- `ACTIVITY_UPDATE`: User activity state changed

## Activity Tracking System

**Important Architectural Decision**: Activity tracking uses **direct Redis publishing** instead of the standard EventService pattern to prevent flooding the events table with heartbeat records.

**Why Different from EventService Pattern?**
- **Events Table Purpose**: The events table tracks discrete actions (votes, publications, notifications) that have permanent significance
- **Activity Heartbeats**: User activity is continuous state information updated every 30 seconds (or more!)
- **Scale Impact**: With 100 active users, EventService would create 288,000 activity records per day (haha... weird AI math? But yeah, too many records)
- **Solution**: Direct Redis publishing bypasses events table while maintaining real-time updates

**Activity Flow**:
1. **Frontend**: `CurrentActivityManager` sends heartbeats every 30 seconds
2. **Backend**: `ControllerWriterActivity.storeOrUpdate()` updates `writer_activity` table (upsert)
3. **Redis Publishing**: `publishActivityUpdateDirect()` publishes site-wide counts to `activities:site` channel
4. **Real-time Updates**: SSE connections receive `siteActivityUpdate` events instantly

**Data Characteristics**:
- **Database**: One record per user (upsert pattern) in `writer_activity` table
- **Redis Messages**: Simplified format `{browsing: N, writing: N, timestamp: T}`
- **No Event IDs**: Activity updates don't use the standard event ID system
- **State vs Events**: Tracks current user state rather than historical actions

## Testing & Troubleshooting

### Toggle Redis for Testing
To test the fallback mechanisms, disable Redis:

```php
// In RedisManager.php
RedisManager::$USE_REDIS = false;
```

### Common Issues
- Redis connection failures
- Missing change records in events table
- Updates appearing for one client but not others
- Stale SSE connections (Redis reports more clients than actual)
- Activity indicator not updating

### Debugging
Check error logs for:
- `EventService:` - Action recording issues
- `SSE Redis:` - Real-time delivery problems  
- `ActivityUpdate:` - Activity tracking issues
- `Redis:` - Pub/sub connection problems 