# Event Communication Test Suite

This test suite validates the real-time event communication system in your application, ensuring that events are properly broadcast to clients via both database polling and Redis pub/sub mechanisms.

## Requirements

- PHP 7.0+
- Redis server (optional, for Redis-specific tests)
- PHP Redis extension (for Redis tests)
- PHP PCNTL extension (for Redis tests with forking)

## Mock Testing System

The test suite uses an in-memory mock database system to avoid requiring a real database connection. This allows the tests to run in isolation and without any configuration, even if your real database isn't available.

### Mock Classes
- `MockCrud` - Base class that simulates the database with in-memory arrays
- `MockEvent`, `MockGame`, `MockText`, `MockNotification` - Mock models that mimic your real models
- `MockPermissionsService` - Simple implementation of permissions logic for testing

The mock system stores all data in memory and provides the same API as your real models, making it easy to test your event communication logic without touching the database.

## Tests Overview

The test suite contains two main test classes:

### 1. EventCommunicationTest

Tests the basic event communication functionality using database polling. This validates that your current implementation works correctly.

**Events tested:**
- Vote events
- Text node creation
- Game updates
- User notifications

### 2. RedisEventTest

Tests the Redis pub/sub implementation specifically, including performance comparisons. These tests will be skipped automatically if Redis is unavailable.

**Features tested:**
- Direct Redis publishing and subscription
- Channel filtering
- Event model integration with Redis
- Performance comparison between Redis and database polling

## Running the Tests

### Running All Tests

```bash
php tests/run_event_tests.php
```

This will run both basic database communication tests and Redis-specific tests.

### Running Only Database Communication Tests

```bash
php tests/EventCommunicationTest.php
```

### Running Only Redis Tests

```bash
php tests/RedisEventTest.php
```

## Test Environment

The tests create temporary test data in memory to validate event propagation. All test data is cleaned up after the tests complete.

For Redis tests, the system uses process forking to simulate separate client and server processes. This provides a more realistic test environment that approximates real usage conditions.

## Interpreting Results

Each test produces output with checkmarks (✅) for passing tests and X marks (❌) for failing tests. At the end of the test run, you'll get a summary showing:

```
TEST RESULTS SUMMARY
------------------------------
PASSED: X
FAILED: Y
TOTAL:  Z
```

If any tests fail, review the error messages to understand what went wrong. Common issues include:

- Missing Redis server or PHP Redis extension
- Incorrect channel names in Redis configuration
- Problems with the Event model logic

## Configuring the Tests

You may need to adjust the test parameters in the test files:

- `$testConfig` in EventCommunicationTest.php controls test timeouts and user IDs
- Channel names in RedisEventTest.php can be adjusted if your application uses different channel naming conventions

## Performance Testing

The Redis tests include performance comparisons between database polling and Redis pub/sub. This helps quantify the performance benefits of using Redis in your specific environment.

The results show how many times faster Redis is compared to database polling for real-time updates. 