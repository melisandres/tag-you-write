<?php
/**
 * Simple Load Testing Script for Tag You Write
 * 
 * This script simulates multiple concurrent users using curl in parallel
 * to test server performance under load.
 */

class SimpleLoadTester {
    private $baseUrl;
    private $results = [];
    
    public function __construct($baseUrl = 'http://localhost:8888/tag-you-write-repo/tag-you-write/') {
        $this->baseUrl = rtrim($baseUrl, '/');
    }
    
    /**
     * Test a single endpoint with multiple concurrent requests
     */
    public function testEndpoint($endpoint, $concurrentUsers = 10, $requestsPerUser = 5) {
        echo "Testing endpoint: {$endpoint}\n";
        echo "Concurrent users: {$concurrentUsers}\n";
        echo "Requests per user: {$requestsPerUser}\n";
        echo "Total requests: " . ($concurrentUsers * $requestsPerUser) . "\n\n";
        
        $startTime = microtime(true);
        $results = [];
        
        // Create curl handles for all requests
        $multiHandle = curl_multi_init();
        $handles = [];
        
        for ($user = 0; $user < $concurrentUsers; $user++) {
            for ($request = 0; $request < $requestsPerUser; $request++) {
                $ch = curl_init();
                $url = $this->baseUrl . $endpoint;
                
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_CONNECTTIMEOUT => 10,
                    CURLOPT_USERAGENT => "LoadTester/1.0 (User:{$user})",
                    CURLOPT_HTTPHEADER => [
                        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language: en-US,en;q=0.5',
                        'Accept-Encoding: gzip, deflate',
                        'Connection: keep-alive',
                    ]
                ]);
                
                $handles[] = [
                    'handle' => $ch,
                    'user_id' => $user,
                    'request_id' => $request,
                    'start_time' => microtime(true)
                ];
                
                curl_multi_add_handle($multiHandle, $ch);
            }
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
        foreach ($handles as $handle) {
            $ch = $handle['handle'];
            $body = curl_multi_getcontent($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
            $connectTime = curl_getinfo($ch, CURLINFO_CONNECT_TIME);
            $error = curl_error($ch);
            
            $results[] = [
                'user_id' => $handle['user_id'],
                'request_id' => $handle['request_id'],
                'status_code' => $httpCode,
                'response_time' => $totalTime * 1000, // Convert to milliseconds
                'connect_time' => $connectTime * 1000,
                'response_size' => strlen($body),
                'success' => $httpCode >= 200 && $httpCode < 400,
                'error' => $error
            ];
            
            curl_multi_remove_handle($multiHandle, $ch);
            curl_close($ch);
        }
        
        curl_multi_close($multiHandle);
        
        $endTime = microtime(true);
        $totalDuration = $endTime - $startTime;
        
        return $this->generateReport($results, $totalDuration);
    }
    
    /**
     * Test multiple endpoints with realistic user behavior
     */
    public function testUserScenarios($concurrentUsers = 10) {
        echo "Testing realistic user scenarios with {$concurrentUsers} concurrent users...\n\n";
        
        $scenarios = [
            ['url' => '/en', 'name' => 'Home Page'],
            ['url' => '/en/text', 'name' => 'Text Index'],
            ['url' => '/en/game', 'name' => 'Game List'],
            ['url' => '/en/writer', 'name' => 'Writer Index'],
        ];
        
        $allResults = [];
        
        foreach ($scenarios as $scenario) {
            echo "Testing: {$scenario['name']}\n";
            $report = $this->testEndpoint($scenario['url'], $concurrentUsers, 3);
            $allResults[] = [
                'scenario' => $scenario['name'],
                'report' => $report
            ];
            
            // Brief pause between scenarios
            sleep(1);
        }
        
        return $this->generateSummaryReport($allResults);
    }
    
    /**
     * Generate detailed report for a single test
     */
    private function generateReport($results, $totalDuration) {
        $responseTimes = array_column($results, 'response_time');
        $successfulRequests = array_filter($results, fn($r) => $r['success']);
        $failedRequests = array_filter($results, fn($r) => !$r['success']);
        
        $report = [
            'total_requests' => count($results),
            'successful_requests' => count($successfulRequests),
            'failed_requests' => count($failedRequests),
            'success_rate' => count($successfulRequests) / count($results) * 100,
            'total_duration' => $totalDuration,
            'requests_per_second' => count($results) / $totalDuration,
            'avg_response_time' => array_sum($responseTimes) / count($responseTimes),
            'min_response_time' => min($responseTimes),
            'max_response_time' => max($responseTimes),
            'median_response_time' => $this->calculateMedian($responseTimes),
            'p95_response_time' => $this->calculatePercentile($responseTimes, 95),
            'p99_response_time' => $this->calculatePercentile($responseTimes, 99)
        ];
        
        return $report;
    }
    
    /**
     * Generate summary report for multiple scenarios
     */
    private function generateSummaryReport($allResults) {
        $summary = [
            'total_scenarios' => count($allResults),
            'overall_success_rate' => 0,
            'overall_avg_response_time' => 0,
            'scenarios' => $allResults
        ];
        
        $totalSuccessRate = 0;
        $totalResponseTime = 0;
        $scenarioCount = 0;
        
        foreach ($allResults as $result) {
            $report = $result['report'];
            $totalSuccessRate += $report['success_rate'];
            $totalResponseTime += $report['avg_response_time'];
            $scenarioCount++;
        }
        
        $summary['overall_success_rate'] = $totalSuccessRate / $scenarioCount;
        $summary['overall_avg_response_time'] = $totalResponseTime / $scenarioCount;
        
        return $summary;
    }
    
    /**
     * Calculate median value
     */
    private function calculateMedian($array) {
        sort($array);
        $count = count($array);
        $middle = floor($count / 2);
        
        if ($count % 2 == 0) {
            return ($array[$middle - 1] + $array[$middle]) / 2;
        } else {
            return $array[$middle];
        }
    }
    
    /**
     * Calculate percentile value
     */
    private function calculatePercentile($array, $percentile) {
        sort($array);
        $count = count($array);
        $index = ceil(($percentile / 100) * $count) - 1;
        return $array[$index] ?? end($array);
    }
    
    /**
     * Print formatted report
     */
    public function printReport($report, $title = 'LOAD TEST RESULTS') {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo $title . "\n";
        echo str_repeat("=", 60) . "\n";
        echo "Total Requests: {$report['total_requests']}\n";
        echo "Successful Requests: {$report['successful_requests']}\n";
        echo "Failed Requests: {$report['failed_requests']}\n";
        echo "Success Rate: " . number_format($report['success_rate'], 2) . "%\n";
        echo "Total Duration: " . number_format($report['total_duration'], 2) . " seconds\n";
        echo "Requests per Second: " . number_format($report['requests_per_second'], 2) . "\n";
        echo "Average Response Time: " . number_format($report['avg_response_time'], 2) . " ms\n";
        echo "Min Response Time: " . number_format($report['min_response_time'], 2) . " ms\n";
        echo "Max Response Time: " . number_format($report['max_response_time'], 2) . " ms\n";
        echo "Median Response Time: " . number_format($report['median_response_time'], 2) . " ms\n";
        echo "95th Percentile: " . number_format($report['p95_response_time'], 2) . " ms\n";
        echo "99th Percentile: " . number_format($report['p99_response_time'], 2) . " ms\n";
        echo str_repeat("=", 60) . "\n";
    }
    
    /**
     * Print summary report
     */
    public function printSummaryReport($summary) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "SUMMARY REPORT\n";
        echo str_repeat("=", 60) . "\n";
        echo "Total Scenarios: {$summary['total_scenarios']}\n";
        echo "Overall Success Rate: " . number_format($summary['overall_success_rate'], 2) . "%\n";
        echo "Overall Average Response Time: " . number_format($summary['overall_avg_response_time'], 2) . " ms\n";
        echo str_repeat("=", 60) . "\n";
        
        foreach ($summary['scenarios'] as $scenario) {
            echo "\nScenario: {$scenario['scenario']}\n";
            $this->printReport($scenario['report'], "DETAILED RESULTS");
        }
    }
}

// Usage example
if (php_sapi_name() === 'cli') {
    $tester = new SimpleLoadTester();
    
    // Test different load levels
    $loadLevels = [10, 25, 50, 100];
    
    foreach ($loadLevels as $users) {
        echo "\n" . str_repeat("*", 60) . "\n";
        echo "TESTING WITH {$users} CONCURRENT USERS\n";
        echo str_repeat("*", 60) . "\n";
        
        $summary = $tester->testUserScenarios($users);
        $tester->printSummaryReport($summary);
        
        // Wait between tests
        sleep(5);
    }
} else {
    echo "This script should be run from command line\n";
} 