<?php
/**
 * Quick Test Script v2 - Load Testing Verification
 * 
 * This script verifies your load testing setup and provides
 * immediate feedback on configuration and connectivity.
 */

// Load configuration
$configPath = __DIR__ . '/../config/test_config.php';
if (!file_exists($configPath)) {
    die("Configuration file not found: {$configPath}\n");
}

$config = require $configPath;

echo "==========================================\n";
echo "Quick Load Test Verification v2\n";
echo "==========================================\n\n";

// Display configuration
echo "Configuration:\n";
echo "Base URL: {$config['server']['base_url']}\n";
echo "Timeout: {$config['server']['timeout']}s\n";
echo "Connect Timeout: {$config['server']['connect_timeout']}s\n";
echo "Environment: " . ($config['environment']['is_development'] ? 'Development' : 'Production') . "\n\n";

// Test 1: Basic connectivity
echo "1. Testing basic connectivity...\n";
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $config['server']['base_url'] . 'en',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => $config['server']['timeout'],
    CURLOPT_CONNECTTIMEOUT => $config['server']['connect_timeout'],
    CURLOPT_USERAGENT => "QuickTest/2.0",
]);

$startTime = microtime(true);
$response = curl_exec($ch);
$endTime = microtime(true);

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
$connectTime = curl_getinfo($ch, CURLINFO_CONNECT_TIME);
$error = curl_error($ch);
curl_close($ch);

$success = $httpCode >= 200 && $httpCode < 400 && empty($error);
echo "   Status: " . ($success ? "✅ PASS" : "❌ FAIL") . "\n";
echo "   HTTP Code: {$httpCode}\n";
echo "   Response Time: " . number_format($totalTime * 1000, 2) . " ms\n";
echo "   Connect Time: " . number_format($connectTime * 1000, 2) . " ms\n";
echo "   Response Size: " . strlen($response) . " bytes\n";
if ($error) echo "   Error: {$error}\n";
echo "\n";

// Test 2: SSE endpoint
echo "2. Testing SSE endpoint...\n";
$sseUrl = $config['server']['base_url'] . trim($config['sse']['endpoint'], '/');
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $sseUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_USERAGENT => "QuickTest/2.0",
    CURLOPT_HTTPHEADER => [
        'Accept: text/event-stream',
        'Cache-Control: no-cache',
    ]
]);

$startTime = microtime(true);
$response = curl_exec($ch);
$endTime = microtime(true);

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
$error = curl_error($ch);
curl_close($ch);

$sseSuccess = $httpCode >= 200 && $httpCode < 400 && empty($error);
echo "   Status: " . ($sseSuccess ? "✅ PASS" : "❌ FAIL") . "\n";
echo "   HTTP Code: {$httpCode}\n";
echo "   Response Time: " . number_format($totalTime * 1000, 2) . " ms\n";
if ($error) echo "   Error: {$error}\n";
echo "\n";

// Test 3: Concurrent requests
echo "3. Testing concurrent requests...\n";
$multiHandle = curl_multi_init();
$handles = [];

for ($i = 0; $i < 5; $i++) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $config['server']['base_url'] . 'en',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => $config['server']['timeout'],
        CURLOPT_CONNECTTIMEOUT => $config['server']['connect_timeout'],
        CURLOPT_USERAGENT => "QuickTest/2.0 (Request:{$i})",
    ]);
    
    $handles[] = $ch;
    curl_multi_add_handle($multiHandle, $ch);
}

$active = null;
do {
    $mrc = curl_multi_exec($multiHandle, $active);
} while ($mrc == CURLM_CALL_MULTI_PERFORM);

while ($active && $mrc == CURLM_OK) {
    if (curl_multi_select($multiHandle) != -1) {
        do {
            $mrc = curl_multi_exec($multiHandle, $active);
        } while ($mrc == CURLM_CALL_MULTI_PERFORM);
    }
}

$concurrentSuccess = 0;
$totalTime = 0;

foreach ($handles as $i => $ch) {
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $responseTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
    $error = curl_error($ch);
    
    if ($httpCode >= 200 && $httpCode < 400 && empty($error)) {
        $concurrentSuccess++;
    }
    $totalTime += $responseTime;
    
    curl_multi_remove_handle($multiHandle, $ch);
    curl_close($ch);
}

curl_multi_close($multiHandle);

$concurrentSuccessRate = ($concurrentSuccess / 5) * 100;
echo "   Status: " . ($concurrentSuccessRate >= 80 ? "✅ PASS" : "❌ FAIL") . "\n";
echo "   Success Rate: " . number_format($concurrentSuccessRate, 1) . "% ({$concurrentSuccess}/5)\n";
echo "   Average Response Time: " . number_format(($totalTime / 5) * 1000, 2) . " ms\n";
echo "\n";

// Test 4: Performance thresholds
echo "4. Checking performance thresholds...\n";
$thresholds = $config['thresholds'];
$performanceIssues = [];

if ($totalTime * 1000 > $thresholds['max_response_time']) {
    $performanceIssues[] = "Response time exceeds threshold";
}

if ($concurrentSuccessRate < $thresholds['min_success_rate']) {
    $performanceIssues[] = "Success rate below threshold";
}

if (empty($performanceIssues)) {
    echo "   Status: ✅ PASS\n";
    echo "   All performance thresholds met\n";
} else {
    echo "   Status: ⚠️  WARNING\n";
    foreach ($performanceIssues as $issue) {
        echo "   - {$issue}\n";
    }
}
echo "\n";

// Summary
echo "==========================================\n";
echo "SUMMARY\n";
echo "==========================================\n";
echo "Basic Connectivity: " . ($success ? "✅ PASS" : "❌ FAIL") . "\n";
echo "SSE Endpoint: " . ($sseSuccess ? "✅ PASS" : "❌ FAIL") . "\n";
echo "Concurrent Requests: " . ($concurrentSuccessRate >= 80 ? "✅ PASS" : "❌ FAIL") . "\n";
echo "Performance Thresholds: " . (empty($performanceIssues) ? "✅ PASS" : "⚠️  WARNING") . "\n";

$overallSuccess = $success && $sseSuccess && $concurrentSuccessRate >= 80;
echo "\nOverall Status: " . ($overallSuccess ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED") . "\n";

if ($overallSuccess) {
    echo "\n🎉 Your load testing setup is ready!\n";
    echo "You can now run the full test suite:\n";
    echo "  ./run_load_tests.sh\n";
} else {
    echo "\n🔧 Please check your configuration and try again.\n";
    echo "Common issues:\n";
    echo "1. MAMP server not running\n";
    echo "2. Incorrect base URL in config\n";
    echo "3. Firewall blocking connections\n";
    echo "4. PHP curl extension not enabled\n";
}

echo "\n==========================================\n"; 