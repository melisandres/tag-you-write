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
8. [Server-Side Rendering](#server-side-rendering)
9. [Context-Aware Optimizations](#context-aware-optimizations)
10. [Data Flow Diagram](#data-flow-diagram)

## Architecture Overview

The application employs a multi-layered approach to handle real-time updates:

1. **Primary System**: Redis Pub/Sub for real-time event broadcasting
2. **Transport Layer**: Server-Sent Events (SSE) for delivering updates to the client
3. **Server-Side Rendering**: Initial notifications and game state rendered with the page
4. **Fallback Systems**: 
   - Backend polling when Redis is unavailable
   - Frontend polling when SSE connection fails
5. **Optimizations**: Context-aware filtering to reduce unnecessary updates

These systems work together to provide a resilient update mechanism that can handle various failure scenarios while maintaining real-time performance when possible.

## Redis Pub/Sub System

### How It Works

1. **Event Creation**: When data changes occur (game updates, new text nodes, notifications), events are recorded in the `event` table
2. **Redis Publishing**: The `RedisService` publishes these events to context-aware Redis channels:
   - `games:updates` + `games:{rootTextId}` - Game updates (both general and story-specific channels)
   - `texts:{rootStoryId}` - Text/node updates for specific stories only
   - `notifications:{writerId}` - User-specific notifications only

3. **Channel Subscription**: The SSE handler subscribes to context-appropriate channels based on user's current viewing context

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
   - `gameSubscriptionType`: Subscription type for filtering (`'all_games'`, `'single_game'`, `'none'`)

3. **Server Processing**: The `EventHandler` on the backend:
   - Connects to Redis if available
   - Subscribes to relevant channels (with optional filtering optimization)
   - Delegates all model operations to `DataFetchService`
   - Falls back to database polling if Redis is unavailable

4. **Event Types**: The SSE connection streams different event types:
   - `update`: Game and node updates
   - `notificationUpdate`: New notifications
   - `keepalive`: Connection maintenance
   - `error`: Error reporting
   - `timeout`: Session timeouts

### Key Components

- **SSEManager.js**: Frontend component that manages the EventSource connection
- **events.php**: Backend endpoint that streams events (simplified to use DataFetchService)
- **EventHandler**: Backend class that processes events and sends them to the client
- **DataFetchService**: Centralized service that handles all database operations and data fetching

## Frontend Polling System

### How It Works

1. **Registration**: The `PollingManager` registers polling tasks with specific intervals
2. **Regular Execution**: Each polling task is executed at its defined interval
3. **Data Retrieval**: Polling uses AJAX requests to fetch updates from the server
4. **Fallback Activation**: Polling is activated when SSE connection fails

### Default Polling Tasks

- **Game List Polling**: Checks for updates to the game list (`checkForUpdates()`)
- **Notification Polling**: Checks for new notifications (supplementary to SSE)

### Key Components

- **PollingManager**: Manages polling tasks and intervals
- **DataManager.checkForUpdates()**: Fetches updates from the server
- **UpdateManager**: Coordinates between SSE and polling systems

## Backend Polling System

### How It Works

1. **Initialization**: If Redis is unavailable, the SSE handler falls back to database polling
2. **Regular Queries**: Every 2 seconds, it queries the database for new events via `DataFetchService`
3. **Event Processing**: Events are processed by `DataFetchService.getUpdates()`
4. **Keepalive**: Every 30 seconds, a keepalive message is sent to maintain the connection

### Key Components

- **EventHandler.runDatabasePolling()**: Manages the polling loop
- **DataFetchService**: Centralized service that handles event processing, database queries, and data fetching
- **Event.getFilteredEvents()**: Retrieves events from the database
- **Connection Recovery**: Automatic model recreation and connection refresh on database timeouts

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

## Server-Side Rendering

### Notifications

**Implementation**: All controllers now include notifications in their initial page render using the `getNotifications()` method from the base `Controller` class.

**Benefits**:
- **Faster Initial Load**: Notifications appear immediately with the page
- **Better UX**: No Flash of Unstyled Content (FOUC)
- **Improved SEO**: Notifications are part of the initial HTML
- **Architectural Simplicity**: Single source of truth for initial state

**Components**:
- **Controller.getNotifications()**: Base method that fetches notifications for any logged-in user
- **header.php**: Renders notifications in the UI and embeds JSON data for JavaScript
- **NotificationManager**: Processes real-time updates but no longer loads initial data

### Game State

Initial game lists and tree data are also server-side rendered, providing immediate content visibility and better performance.

## Failover Mechanisms

### 1. Redis Unavailable → Backend Polling

- **Detection**: `RedisManager.isAvailable()` returns false
- **Action**: `EventHandler` falls back to `runDatabasePolling()`
- **Recovery**: Automatic reconnection attempts for Redis

### 2. SSE Connection Fails → Frontend Polling

- **Detection**: `SSEManager` detects connection failure
- **Action**: Emits `sseFailed` event, triggering `UpdateManager.handleSSEFailure()`
- **Recovery**: `PollingManager` activates, max retries for SSE (5 attempts)

### 3. Database Connection Issues

- **Protection**: `DataFetchService.executeWithRetry()` handles connection timeouts
- **Action**: Automatic model recreation and connection refresh
- **Recovery**: Up to 3 retry attempts with fresh database connections

### 4. Missed Redis Events

- **Protection**: `checkMissedEvents()` runs when the SSE connection starts
- **Action**: Queries database for events since `lastEventId`
- **Recovery**: Processes any missed events before starting Redis subscription

## Game Removal Detection

### Overview

When a game that was previously visible (matching current filters/search/category) gets updated in a way that removes it from the current view, the system needs to detect this and signal the frontend to remove it.

**Examples:**
- User searches for "dragon", finds a game with "dragon" in a note. Another user edits the note, removing "dragon". The game should be removed from search results.
- User views "myStories.active" category. Another player casts a winning vote, closing the game. The game should be removed from the active list (it now belongs to "myStories.archives").

### Implementation

The system handles game removals differently for Redis/SSE and polling:

**Redis/SSE (Real-time updates):**
- When a game update arrives via Redis, the system checks if the game still matches current filters
- If the game doesn't match → sends `gameIdsForRemoval` to frontend
- Frontend handles removal gracefully (no-op if game not in cache)

**Polling (Backend & Frontend fallback):**
- Uses a two-query approach for detection:
  1. Query `getModifiedSince()` WITH filters/search/category → gets games that match AND were modified
  2. Query `getModifiedSince()` WITHOUT filters → gets ALL modified games
  3. Compare: games in #2 but not in #1 = games that were modified but no longer match
  4. Send these as `gameIdsForRemoval`

**Frontend Handling:**
- `DataManager.removeGames()` safely removes games from cache
- If game not in cache, operation is a no-op (no errors)
- Emits `gamesRemoved` event for UI updates

### Benefits

- **Simple**: No need to track displayed games separately
- **Efficient**: Only sends removals when games are actually modified
- **Resilient**: Works across all update systems (Redis, SSE, polling)
- **Safe**: Frontend handles removals gracefully

## Context-Aware Architecture

### Overview

The system uses context-aware channels to deliver only relevant updates based on the user's current viewing context. This applies to both text and game updates.

### Context-Aware Text Updates (Core Feature)

Text updates are inherently context-aware:
- **Channel Pattern**: `texts:{rootStoryId}` - Only users viewing a specific story receive its text updates
- **Implementation**: Built into the core Redis publishing and SSE subscription logic
- **Benefit**: Users never receive text updates for stories they're not viewing

### Context-Aware Game Updates (Performance Optimization)

Game updates can be filtered by page context:
- **Game List Page**: Receives ALL game updates (`'all_games'`)
- **Collaboration Page**: Receives updates for the CURRENT game only (`'single_game'`)  
- **Text Form Page**: Context-dependent - single game for edits, none for new games

**Implementation**: The `GameSubscriptionManager` detects page type and works across all update systems:
- **Redis**: Dual-channel publishing (`games:updates` + `games:{rootTextId}`)
- **SSE**: Context-aware subscriptions based on `gameSubscriptionType`
- **AJAX**: Post-query filtering for fallback scenarios

### Benefits

- **Network Efficiency**: Users only receive updates relevant to their current context
- **Server Performance**: Reduced processing through targeted subscriptions and channels
- **Architectural Consistency**: Both text and game updates follow context-aware patterns

## Data Flow Diagram

```
┌────────────────┐     ┌─────────────┐     ┌────────────────────┐
│  Data Changes  │────▶│   Events    │────▶│ Context-Aware      │
└────────────────┘     └─────────────┘     │ Redis Publishing   │
                                           │ • games:updates    │
                                           │ • games:{textId}   │
                                           └─────────┬──────────┘
                                                     │
                        ┌────────────────────────────┼─────────────────┐
                        │                            ▼                 │
                        │            ┌────────────────────────────┐     │
                        │            │ Context-Aware              │     │
                        │            │ SSE Subscriptions          │     │
                        │            │ • GameSubscriptionManager  │     │
                        │            │ • Channel Selection        │     │
                        │            └──────────┬─────────────────┘     │
                        │                       │                       │
                        │                       ▼                       │
┌────────────────┐     │┌─────────────┐     ┌────────────────┐          │
│ Frontend Cache │◀────││ SSE Handler │◀────│ DataFetchServ  │          │
└────────────────┘     │└─────────────┘     └────────────────┘          │
       ▲               │                            ▲                   │
       │               │                            │                   │
       │               │┌─────────────────┐         │                   │
┌────────────────┐     ││ Server-Side     │         │                   │
│ Context-Aware  │◀────││ Rendering       │         │                   │
│ AJAX Filtering │     │└─────────────────┘         │                   │
└────────────────┘     │                            │                   │
                       │┌─────────────────┐         │                   │
                       ││ Database Poll   │─────────┘                   │
                       │└─────────────────┘                             │
                       │  (Fallback Path)                               │
                       └────────────────────────────────────────────────┘
                         Context-Aware Update Delivery System
```

### System Benefits

This architecture provides multiple paths for updates to reach the client with **context-aware optimizations**:

- **Server-Side Rendering**: Immediate content availability on page load
- **Context-Aware Subscriptions**: Users only receive relevant updates
- **Progressive Enhancement**: Graceful degradation through multiple fallback layers
- **Centralized Processing**: DataFetchService ensures consistency across all update mechanisms
- **Network Efficiency**: Reduced bandwidth through targeted update delivery 