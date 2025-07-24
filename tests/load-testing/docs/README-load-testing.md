# Load Testing Guide for Tag You Write

This guide provides multiple approaches to test your server's performance with multiple concurrent users without needing actual humans.

## 🎯 What We're Testing

Your application has several critical components that need load testing:

1. **HTTP Requests** - Standard web pages and API endpoints
2. **Database Connections** - Your connection pooling system
3. **SSE (Server-Sent Events)** - Real-time updates for your game
4. **Redis** - Real-time event broadcasting
5. **Session Management** - User authentication and state

## 🛠️ Testing Tools Provided

### 1. Apache Bench (ab) - Built-in Tool
**Pros:** Simple, fast, built into most systems
**Cons:** Limited to basic HTTP requests

```bash
# Test 10 concurrent users making 100 requests each
ab -n 1000 -c 10 http://localhost:8888/tag-you-write-repo/tag-you-write/

# Test 100 concurrent users making 50 requests each  
ab -n 5000 -c 100 http://localhost:8888/tag-you-write-repo/tag-you-write/
```

### 2. Custom PHP Load Tester (`simple_load_test.php`)
**Pros:** Realistic user behavior, detailed metrics, tests multiple endpoints
**Cons:** More complex setup

```bash
php simple_load_test.php
```

### 3. SSE Load Tester (`sse_load_test.php`)
**Pros:** Specifically tests real-time connections, critical for your game
**Cons:** Requires process forking (may not work on all systems)

```bash
php sse_load_test.php
```

### 4. Automated Test Suite (`run_load_tests.sh`)
**Pros:** Runs all tests automatically, generates reports
**Cons:** Requires bash environment

```bash
./run_load_tests.sh
```

### 5. Quick Verification Test (`quick_test.php`)
**Pros:** Fast verification that everything is configured correctly
**Cons:** Limited scope

```bash
php quick_test.php
```

## 🚀 Quick Start

### Option 1: Run Everything (Recommended)
```bash
./run_load_tests.sh
```

### Option 2: Test Individual Components
```bash
# Quick verification first
php quick_test.php

# Basic HTTP testing
ab -n 1000 -c 10 http://localhost:8888/tag-you-write-repo/tag-you-write/

# Custom PHP testing
php simple_load_test.php

# SSE testing
php sse_load_test.php
```

## 🔧 Configuration

### URL Configuration
The tests are configured for MAMP's default setup:
- **Base URL:** `http://localhost:8888/tag-you-write-repo/tag-you-write/`
- **Port:** 8888 (MAMP default)
- **Path:** Includes the full repository path

If your setup is different, update the base URL in:
- `simple_load_test.php` (line 12)
- `sse_load_test.php` (line 12)
- `run_load_tests.sh` (line 58)

### Adjusting Test Parameters

Edit the test files to match your needs:

```php
// In simple_load_test.php
$loadLevels = [10, 25, 50, 100]; // Concurrent users to test

// In sse_load_test.php
$scenarios = [
    ['connections' => 5, 'duration' => 15, 'name' => 'Light Load'],
    ['connections' => 20, 'duration' => 30, 'name' => 'Medium Load'],
    ['connections' => 50, 'duration' => 45, 'name' => 'Heavy Load'],
    ['connections' => 100, 'duration' => 60, 'name' => 'Stress Test']
];
```

### Server Configuration

**Apache/MAMP Settings:**
```apache
# In httpd.conf or virtual host
MaxKeepAliveRequests 100
KeepAliveTimeout 5
MaxClients 150
```

**PHP Settings:**
```ini
; In php.ini
max_execution_time = 300
memory_limit = 256M
max_input_vars = 3000
```

## 📊 Understanding Results

### Key Metrics to Monitor

1. **Response Time (ms)**
   - < 200ms: Excellent
   - 200-500ms: Good
   - 500-1000ms: Acceptable
   - > 1000ms: Needs optimization

2. **Requests per Second**
   - Higher is better
   - Depends on your server specs

3. **Success Rate**
   - Should be 95%+ for production
   - Monitor failed requests

4. **Connection Errors**
   - Should be minimal
   - Indicates server/network issues

### Database Connection Pooling

Your `DatabaseConnection.php` has a connection pool with:
- Max connections: 10
- Connection timeout: 300 seconds
- Periodic cleanup every 60 seconds

**Watch for:**
- Connection pool exhaustion
- Slow connection establishment
- Connection failures

### SSE Performance

Your real-time features depend on SSE connections:
- Monitor connection establishment time
- Check event delivery rate
- Watch for connection drops

## 🎯 Testing Scenarios

### Light Load (10-25 users)
- Good for development testing
- Should work perfectly
- Baseline performance

### Medium Load (50-100 users)
- Realistic for small to medium sites
- May reveal bottlenecks
- Test connection pooling

### Heavy Load (100+ users)
- Stress testing
- Find breaking points
- Optimize server settings

## 🔍 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if MAMP server is running
   - Verify port 8888 is correct
   - Check firewall settings

2. **Timeout Errors**
   - Increase timeout values
   - Check server resources
   - Optimize database queries

3. **Memory Issues**
   - Increase PHP memory_limit
   - Check for memory leaks
   - Monitor server RAM usage

4. **SSE Connection Drops**
   - Check Redis connection
   - Monitor server logs
   - Verify SSE endpoint

### Debug Commands

```bash
# Check server status
ps aux | grep apache
ps aux | grep php

# Monitor system resources
top
htop

# Check network connections
netstat -an | grep :8888

# Monitor logs
tail -f /Applications/MAMP/logs/apache_error.log
tail -f /Applications/MAMP/logs/php_error.log

# Test URL manually
curl -I http://localhost:8888/tag-you-write-repo/tag-you-write/
```

## 📈 Performance Optimization

### Database Optimization
- Ensure proper indexing
- Optimize slow queries
- Consider query caching

### Server Optimization
- Enable OPcache for PHP
- Use gzip compression
- Optimize static file serving

### Application Optimization
- Implement caching strategies
- Optimize session handling
- Minimize database connections

## 🎓 Best Practices

1. **Test Regularly**
   - Before major deployments
   - After configuration changes
   - Monitor performance trends

2. **Start Small**
   - Begin with light load tests
   - Gradually increase load
   - Monitor system resources

3. **Document Results**
   - Save test reports
   - Track performance over time
   - Note configuration changes

4. **Monitor Production**
   - Use real user analytics
   - Monitor server metrics
   - Set up alerts for issues

## 🔗 Additional Tools

For more advanced testing, consider:

- **JMeter** - Java-based load testing
- **Artillery** - Node.js load testing
- **Locust** - Python-based load testing
- **Gatling** - Scala-based load testing

## 📝 Example Results

Here's what good results look like:

```
==========================================
LOAD TEST RESULTS
==========================================
Total Requests: 1000
Successful Requests: 995
Failed Requests: 5
Success Rate: 99.50%
Total Duration: 45.23 seconds
Requests per Second: 22.11
Average Response Time: 234.56 ms
Min Response Time: 89.12 ms
Max Response Time: 567.89 ms
Median Response Time: 198.45 ms
95th Percentile: 412.34 ms
99th Percentile: 523.67 ms
==========================================
```

## 🚨 Warning

**Never run heavy load tests on production servers without warning!**
- Test on staging environments
- Schedule tests during low-traffic periods
- Monitor server resources closely
- Have a rollback plan ready

---

*This testing suite will help you understand your application's performance characteristics and identify areas for optimization before real users experience issues.* 