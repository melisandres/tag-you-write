# Event System Documentation

## Overview
The event system is designed to track and broadcast various actions that occur within the application. It uses a combination of database storage and Redis for real-time event broadcasting.

## Architecture
- `EventService.php`: Main service class that handles event creation and processing
- `EventConfig.php`: Configuration file that defines event types and their requirements
- `RedisService.php`: Handles real-time event broadcasting through Redis

## How Events Work
1. An event is triggered by calling `EventService::createEvents()`
2. The service validates the event data against configuration
3. Events are stored in the database
4. Events are published to Redis for real-time updates

## Adding a New Event Type

### Step 1: Define Event Configuration
Add your new event type to `EventConfig.php`. Each event type needs:
- Required fields
- Event definitions (what events to create)
- Payload fields

Example:
```php
'NEW_EVENT_TYPE' => [
    'required_fields' => ['field1', 'field2'],
    'events' => [
        'table_name' => [
            'type' => 'event_type_name',
            'table' => 'related_table',
            'payload_fields' => ['field1', 'field2']
        ]
    ]
]
```

### Step 2: Create Event
To create your new event, call:
```php
$eventService = new EventService();
$eventService->createEvents('NEW_EVENT_TYPE', [
    'field1' => 'value1',
    'field2' => 'value2'
], [
    'user_id' => $userId,
    'action' => 'action_name'
]);
```

### Step 3: Handle Event (Optional)
If you need to handle the event in real-time:
1. Subscribe to Redis events
2. Process the event payload
3. Update your application state

## Event Types Reference

### Current Event Types
- `ROOT_PUBLISH`: When a root text is published
- `CONTRIB_PUBLISH`: When a contribution is published
- `NOTE_ADD`: When a note is added to text
- `VOTE_TOGGLE`: When a vote is added/removed
- `WINNING_VOTE`: When a text wins voting
- `GAME_CLOSED`: When a game is closed
- `NOTIFICATION_CREATED`: When a notification is created

### Event Payload Structure
Each event contains:
- `event_type`: Type of event
- `related_table`: Table the event relates to
- `related_id`: ID of the related record
- `root_text_id`: ID of the root text
- `writer_id`: ID of the user who triggered the event
- `payload`: Event-specific data
- `created_at`: Timestamp

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