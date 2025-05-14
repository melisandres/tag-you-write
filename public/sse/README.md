# Router-Bypassing SSE Implementation

This directory contains a specialized implementation of Server-Sent Events (SSE) that bypasses the framework's router.

## Why This Approach?

The framework's router was interfering with SSE connections by:
1. Adding language prefixes to URLs (e.g., `/en/events_sse.php`)
2. Returning HTML content instead of the expected `text/event-stream` MIME type
3. Causing browsers to abort the EventSource connection due to incorrect content type

## Essential Files

- `events.php`: The main SSE implementation that connects to the database and sends real-time events
- `bootstrap.php`: Loads environment variables and database configuration

## Optional/Utility Files

- `README.md`: This documentation file


## How to Use

### In JavaScript

The `SSEManager.js` has been updated to use this implementation by default. It creates connections directly to:

```javascript
const url = `/tag-you-write/public/sse/events.php?${params.toString()}`;
```

## How It Works

This solution works by:

1. Placing the SSE implementation in a directory that is directly accessible via URL
2. Correctly setting the `Content-Type: text/event-stream` header
3. Using existing models to fetch and process events
4. Maintaining a persistent connection to send updates in real-time

The implementation handles:
- Setting proper headers for SSE
- Managing database connections 
- Processing and sending events based on their type:
  - Game updates
  - Text/node updates
  - Notifications (for authenticated users only)
- Security via session-based authentication
- Type normalization for consistent JSON structure

## Troubleshooting

If you encounter issues:

1. Check browser console for connection errors
2. Verify the URL is not being rewritten by the router (should not have language prefix)
3. Check server logs for PHP errors
4. Ensure the database connection is working properly

## Security Considerations

- Only authenticated users receive notifications
- Writer ID is only taken from the session, never from URL parameters
- Explicit security checks are made before sending personalized content 