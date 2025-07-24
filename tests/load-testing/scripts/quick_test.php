<?php
/**
 * Quick Test Script to verify load testing configuration
 */

echo "==========================================\n";
echo "Quick Load Test Verification\n";
echo "==========================================\n\n";

$baseUrl = 'http://localhost:8888/tag-you-write-repo/tag-you-write/';

echo "Testing URL: {$baseUrl}\n\n";

// Test a single request first
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $baseUrl . 'en',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_USERAGENT => "QuickTest/1.0",
]);

$startTime = microtime(true);
$response = curl_exec($ch);
$endTime = microtime(true);

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
$error = curl_error($ch);
curl_close($ch);

echo "Single Request Test:\n";
echo "Status Code: {$httpCode}\n";
echo "Response Time: " . number_format($totalTime * 1000, 2) . " ms\n";
echo "Response Size: " . strlen($response) . " bytes\n";
echo "Error: " . ($error ?: 'None') . "\n";
echo "Success: " . ($httpCode >= 200 && $httpCode < 400 ? 'Yes' : 'No') . "\n\n";

if ($httpCode >= 200 && $httpCode < 400) {
    echo "✅ Single request test PASSED\n\n";
    
    // Now test with multiple concurrent requests
    echo "Testing 5 concurrent requests...\n";
    
    $multiHandle = curl_multi_init();
    $handles = [];
    
    for ($i = 0; $i < 5; $i++) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $baseUrl . 'en',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_USERAGENT => "QuickTest/1.0 (Request:{$i})",
        ]);
        
        $handles[] = $ch;
        curl_multi_add_handle($multiHandle, $ch);
    }
    
    // Execute all requests
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
    
    // Collect results
    $successCount = 0;
    $totalTime = 0;
    
    foreach ($handles as $i => $ch) {
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $responseTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $error = curl_error($ch);
        
        echo "Request {$i}: HTTP {$httpCode}, " . number_format($responseTime * 1000, 2) . " ms" . ($error ? " (Error: $error)" : "") . "\n";
        
        if ($httpCode >= 200 && $httpCode < 400) {
            $successCount++;
        }
        $totalTime += $responseTime;
        
        curl_multi_remove_handle($multiHandle, $ch);
        curl_close($ch);
    }
    
    curl_multi_close($multiHandle);
    
    echo "\nConcurrent Test Results:\n";
    echo "Successful Requests: {$successCount}/5\n";
    echo "Success Rate: " . number_format(($successCount / 5) * 100, 1) . "%\n";
    echo "Average Response Time: " . number_format(($totalTime / 5) * 1000, 2) . " ms\n";
    
    if ($successCount == 5) {
        echo "✅ Concurrent request test PASSED\n\n";
        echo "🎉 All tests passed! Your load testing setup is working correctly.\n";
        echo "You can now run the full load tests:\n";
        echo "  ./run_load_tests.sh\n";
        echo "  php simple_load_test.php\n";
        echo "  php sse_load_test.php\n";
    } else {
        echo "❌ Concurrent request test FAILED\n";
        echo "Check your server configuration and try again.\n";
    }
    
} else {
    echo "❌ Single request test FAILED\n";
    echo "Please check:\n";
    echo "1. Your MAMP server is running\n";
    echo "2. The URL is correct: {$baseUrl}\n";
    echo "3. Your application is accessible\n";
}

echo "\n==========================================\n"; 