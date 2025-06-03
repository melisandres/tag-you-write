# Event System Documentation

## Overview
The event system tracks and broadcasts actions within the application using a three-tiered approach for real-time updates:

1. **Redis Pub/Sub** (Primary method)
2. **Server-Sent Events (SSE) Polling** (First fallback)
3. **Frontend AJAX Polling** (Second fallback)

## Architecture

### Core Components
- `EventService`: Creates events in the database and publishes to Redis
- `EventConfig`: Defines event types and their configurations
- `RedisManager`: Handles Redis connections and pub/sub operations
- `RedisService`: Publishes events to appropriate Redis channels
- `DataFetchService`: Shared service for both SSE and controller endpoints

### Data Flow
1. Controller action occurs (vote, publish, etc.)
2. `EventService` creates database record(s) with:
   - `related_table` (game, text, notification)
   - `related_id` (specific record ID)
   - `event_type` (descriptive label)
3. If Redis available, event is published to appropriate channel
4. Clients receive updates through one of three methods:
   - Redis pub/sub subscription
   - SSE polling fallback
   - Frontend AJAX polling fallback

## How Updates Are Processed

### Key Concept: Table-Based Processing

**Important**: While event types (ROOT_PUBLISH, VOTE_TOGGLE, etc.) provide context about what happened, the system actually processes updates based on:

1. `related_table` - Which table was affected (game, text, notification)
2. `related_id` - Which specific record to fetch

This approach allows for efficient database queries and targeted updates.

### Processing Flow
1. Event created with related_table and related_id
2. Client receives event through Redis or polling
3. Client queries the specific related record using related_id
4. UI updates with fresh data

## Update Delivery Methods

### 1. Redis Pub/Sub (Primary)
- Real-time updates through persistent connection
- Clients subscribe to specific channels:
  - `games:updates`
  - `texts:{rootStoryId}`
  - `notifications:{writerId}`
- `RedisManager` publishes events to these channels
- No polling or database queries except on initial connection

### 2. SSE Polling (First Fallback)
- Used when Redis is unavailable
- `DataFetchService` queries the events table first
- Then selectively fetches related records only as needed
- Long-running connection with periodic polls
- Managed by `events.php`

### 3. Frontend Polling (Second Fallback)
- Used if SSE connection fails
- Regular AJAX calls to controller endpoints
- Uses the same `DataFetchService` as SSE
- Configurable polling intervals

## Adding a New Event Type

### Step 1: Define Event Configuration
Add your new event type to `EventConfig.php`:

```php
'NEW_EVENT_TYPE' => [
    'required_fields' => ['field1', 'field2'],
    'events' => [
        [
            'type' => 'event_type_name',
            'table' => 'related_table',  // Important! Determines how event is processed
            'payload_fields' => ['field1', 'field2']
        ]
    ]
]
```

### Step 2: Create Event
```php
$eventService = new EventService();
$eventService->createEvents('NEW_EVENT_TYPE', [
    'field1' => 'value1',
    'field2' => 'value2'
]);
```

## Event Types Reference

Current event types are primarily for logging and context, not for routing updates:

- `ROOT_PUBLISH`: Root text published
- `CONTRIB_PUBLISH`: Contribution published
- `NOTE_ADD`: Note added
- `VOTE_TOGGLE`: Vote added/removed
- `WINNING_VOTE`: Text won voting
- `GAME_CLOSED`: Game closed
- `NOTIFICATION_CREATED`: Notification created

## Testing & Troubleshooting

### Toggle Redis for Testing
To test the fallback mechanisms, you can disable Redis:

```php
// In RedisManager.php
RedisManager::$USE_REDIS = false;
```

### Common Issues
- Redis connection failures
- Missing event records
- Updates appearing for one client but not others

### Debugging
Check error logs for:
- "SSE:" prefix for SSE-related logs
- "Redis:" prefix for Redis-related logs
- "DataFetchService:" for polling-related logs

## Best Practices
1. Always validate required fields before creating events
2. Keep event payloads minimal and focused
3. Use descriptive event types and payload fields
4. Document new event types in this README
5. Test event creation and handling thoroughly

## Troubleshooting
- Check error logs for validation failures
- Verify Redis connection if events aren't broadcasting
- Ensure all required fields are provided
- Check event configuration matches your needs 