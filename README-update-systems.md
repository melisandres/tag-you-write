# Update Systems Documentation

This document provides comprehensive information about the real-time update systems in the Tag You Write application. The application uses multiple approaches to ensure users receive timely updates while maintaining system resilience.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Redis Pub/Sub System](#redis-pubsub-system)
3. [Server-Sent Events (SSE)](#server-sent-events-sse)
4. [Frontend Polling System](#frontend-polling-system)
5. [Backend Polling System](#backend-polling-system)
6. [Update Tracking Mechanisms](#update-tracking-mechanisms)
7. [Failover Mechanisms](#failover-mechanisms)
8. [Data Flow Diagram](#data-flow-diagram)

## Architecture Overview

The application employs a multi-layered approach to handle real-time updates:

1. **Primary System**: Redis Pub/Sub for real-time event broadcasting
2. **Transport Layer**: Server-Sent Events (SSE) for delivering updates to the client
3. **Fallback Systems**: 
   - Backend polling when Redis is unavailable
   - Frontend polling when SSE connection fails

These systems work together to provide a resilient update mechanism that can handle various failure scenarios while maintaining real-time performance when possible.

## Redis Pub/Sub System

### How It Works

1. **Event Creation**: When data changes occur (game updates, new text nodes, notifications), events are recorded in the `event` table
2. **Redis Publishing**: The `RedisService` publishes these events to specific Redis channels:
   - `games:updates` - For game state changes
   - `texts:{rootStoryId}` - For text/node updates in a specific story
   - `notifications:{writerId}` - For user-specific notifications

3. **Channel Subscription**: The SSE handler subscribes to relevant channels based on user context

### Key Components

- **RedisManager**: Handles low-level Redis connections and pub/sub operations
- **RedisService**: Higher-level service that determines appropriate channels and formats messages
- **Event Model**: Creates events and triggers Redis publishing

## Server-Sent Events (SSE)

### How It Works

1. **Connection Establishment**: The `SSEManager` on the frontend establishes an SSE connection to `/public/sse/events.php`
2. **Parameter Passing**: The connection includes context parameters:
   - `lastEventId`: Last processed event ID
   - `rootStoryId`: Currently viewed story
   - `filters`: Current game filters
   - `search`: Current search term
   - `lastGamesCheck`: Timestamp of last game check
   - `lastTreeCheck`: Timestamp of last tree check

3. **Server Processing**: The `EventHandler` on the backend:
   - Connects to Redis if available
   - Subscribes to relevant channels
   - Processes messages and sends updates to the client
   - Falls back to database polling if Redis is unavailable

4. **Event Types**: The SSE connection streams different event types:
   - `update`: Game and node updates
   - `notificationUpdate`: New notifications
   - `keepalive`: Connection maintenance
   - `error`: Error reporting
   - `timeout`: Session timeouts

### Key Components

- **SSEManager.js**: Frontend component that manages the EventSource connection
- **events.php**: Backend endpoint that streams events
- **EventHandler**: Backend class that processes events and sends them to the client

## Frontend Polling System

### How It Works

1. **Registration**: The `PollingManager` registers polling tasks with specific intervals
2. **Regular Execution**: Each polling task is executed at its defined interval
3. **Data Retrieval**: Polling uses AJAX requests to fetch updates from the server
4. **Fallback Activation**: Polling is activated when SSE connection fails

### Default Polling Tasks

- **Game List Polling**: Checks for updates to the game list (`checkForUpdates()`)
- **Notification Polling**: Checks for new notifications

### Key Components

- **PollingManager**: Manages polling tasks and intervals
- **DataManager.checkForUpdates()**: Fetches updates from the server
- **UpdateManager**: Coordinates between SSE and polling systems

## Backend Polling System

### How It Works

1. **Initialization**: If Redis is unavailable, the SSE handler falls back to database polling
2. **Regular Queries**: Every 2 seconds, it queries the database for new events
3. **Event Processing**: Events are processed similarly to Redis messages
4. **Keepalive**: Every 30 seconds, a keepalive message is sent to maintain the connection

### Key Components

- **EventHandler.runDatabasePolling()**: Manages the polling loop
- **Event.getFilteredEvents()**: Retrieves events from the database
- **EventHandler.processEvents()**: Processes events and sends updates

## Update Tracking Mechanisms

The system uses several mechanisms to track updates:

### Event IDs

- **Purpose**: Track the last processed event ID
- **Storage**: Stored in `DataManager.cache.lastEventId` and persisted to localStorage
- **Usage**: Sent with SSE connection to resume from last known point
- **Update**: Updated when processing events from both Redis and polling

### Timestamps

- **lastGamesCheck**:
  - **Purpose**: Track when games were last checked
  - **Storage**: Stored in `DataManager.cache.lastGamesCheck`
  - **Usage**: Used for polling to fetch only modified games
  - **Update**: Updated after receiving and processing game updates

- **Tree Timestamps**:
  - **Purpose**: Track when each tree was last updated
  - **Storage**: Stored in `DataManager.cache.trees.get(rootId).timestamp`
  - **Usage**: Used to fetch only modified nodes for a specific tree
  - **Update**: Updated after receiving and processing tree updates

### Current Behavior

- Timestamps are updated regardless of update source (Redis or polling)
- This ensures a consistent "last known good state" for failover between systems
- Prevents duplicate processing of updates when switching between update mechanisms

## Failover Mechanisms

### 1. Redis Unavailable → Backend Polling

- **Detection**: `RedisManager.isAvailable()` returns false
- **Action**: `EventHandler` falls back to `runDatabasePolling()`
- **Recovery**: Automatic reconnection attempts for Redis

### 2. SSE Connection Fails → Frontend Polling

- **Detection**: `SSEManager` detects connection failure
- **Action**: Emits `sseFailed` event, triggering `UpdateManager.handleSSEFailure()`
- **Recovery**: `PollingManager` activates, max retries for SSE (5 attempts)

### 3. Missed Redis Events

- **Protection**: `checkMissedEvents()` runs when the SSE connection starts
- **Action**: Queries database for events since `lastEventId`
- **Recovery**: Processes any missed events before starting Redis subscription

## Data Flow Diagram

```
┌────────────────┐     ┌─────────────┐     ┌────────────────┐
│  Data Changes  │────▶│   Events    │────▶│  Redis Pub/Sub │
└────────────────┘     └─────────────┘     └────────────────┘
                                                   │
                                                   ▼
┌────────────────┐     ┌─────────────┐     ┌────────────────┐
│ Frontend Cache │◀────│ SSE Handler │◀────│ Event Handler  │
└────────────────┘     └─────────────┘     └────────────────┘
       ▲                                            ▲
       │                                            │
       │                                            │
┌────────────────┐                         ┌────────────────┐
│ Polling AJAX   │─────────────────────────│ Database Poll  │
└────────────────┘   (Fallback Paths)      └────────────────┘
```

This architecture provides multiple paths for updates to reach the client, ensuring system resilience while maintaining real-time performance when possible. 