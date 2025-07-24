<?php
/**
 * SSE Load Testing Script for Tag You Write
 * 
 * This script specifically tests Server-Sent Events connections
 * which are critical for real-time functionality in your game.
 */

class SSELoadTester {
    private $baseUrl;
    private $results = [];
    
    public function __construct($baseUrl = 'http://localhost:8888/tag-you-write-repo/tag-you-write/') {
        $this->baseUrl = rtrim($baseUrl, '/');
    }
    
    /**
     * Test SSE connection with multiple concurrent clients
     */
    public function testSSEConnections($concurrentConnections = 10, $duration = 30) {
        echo "Testing SSE connections: {$concurrentConnections} concurrent connections for {$duration} seconds...\n";
        
        $startTime = microtime(true);
        $processes = [];
        $results = [];
        
        // Create child processes for each SSE connection
        for ($i = 0; $i < $concurrentConnections; $i++) {
            $pid = pcntl_fork();
            
            if ($pid == -1) {
                die("Could not fork process for SSE connection {$i}\n");
            } elseif ($pid == 0) {
                // Child process - establish SSE connection
                $result = $this->establishSSEConnection($i, $duration);
                exit(json_encode($result));
            } else {
                // Parent process - store PID
                $processes[$pid] = $i;
            }
        }
        
        // Wait for all processes to complete
        foreach ($processes as $pid => $connectionId) {
            $status = 0;
            pcntl_waitpid($pid, $status);
            
            if (pcntl_wexitstatus($status) == 0) {
                // Process completed successfully
                $results[] = [
                    'connection_id' => $connectionId,
                    'status' => 'completed'
                ];
            } else {
                $results[] = [
                    'connection_id' => $connectionId,
                    'status' => 'failed'
                ];
            }
        }
        
        $endTime = microtime(true);
        $totalDuration = $endTime - $startTime;
        
        return $this->generateSSEReport($results, $totalDuration, $concurrentConnections);
    }
    
    /**
     * Establish a single SSE connection
     */
    private function establishSSEConnection($connectionId, $duration) {
        $sseUrl = $this->baseUrl . '/public/sse/events.php';
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $sseUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => $duration + 5,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_USERAGENT => "SSELoadTester/1.0 (Connection:{$connectionId})",
            CURLOPT_HTTPHEADER => [
                'Accept: text/event-stream',
                'Cache-Control: no-cache',
                'Connection: keep-alive',
            ]
        ]);
        
        $startTime = microtime(true);
        $response = curl_exec($ch);
        $endTime = microtime(true);
        
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $connectTime = curl_getinfo($ch, CURLINFO_CONNECT_TIME);
        $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $error = curl_error($ch);
        curl_close($ch);
        
        return [
            'connection_id' => $connectionId,
            'status_code' => $httpCode,
            'connect_time' => $connectTime * 1000,
            'total_time' => $totalTime * 1000,
            'duration' => ($endTime - $startTime) * 1000,
            'response_size' => strlen($response),
            'success' => $httpCode >= 200 && $httpCode < 400 && empty($error),
            'error' => $error,
            'events_received' => substr_count($response, 'data:')
        ];
    }
    
    /**
     * Test SSE with curl multi (alternative approach)
     */
    public function testSSEMulti($concurrentConnections = 10, $duration = 30) {
        echo "Testing SSE with curl multi: {$concurrentConnections} concurrent connections for {$duration} seconds...\n";
        
        $startTime = microtime(true);
        $multiHandle = curl_multi_init();
        $handles = [];
        
        // Create curl handles for all SSE connections
        for ($i = 0; $i < $concurrentConnections; $i++) {
            $ch = curl_init();
            $sseUrl = $this->baseUrl . '/public/sse/events.php';
            
            curl_setopt_array($ch, [
                CURLOPT_URL => $sseUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => $duration + 5,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_USERAGENT => "SSELoadTester/1.0 (Connection:{$i})",
                CURLOPT_HTTPHEADER => [
                    'Accept: text/event-stream',
                    'Cache-Control: no-cache',
                    'Connection: keep-alive',
                ]
            ]);
            
            $handles[] = [
                'handle' => $ch,
                'connection_id' => $i,
                'start_time' => microtime(true)
            ];
            
            curl_multi_add_handle($multiHandle, $ch);
        }
        
        // Execute all connections
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
        $results = [];
        foreach ($handles as $handle) {
            $ch = $handle['handle'];
            $body = curl_multi_getcontent($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
            $connectTime = curl_getinfo($ch, CURLINFO_CONNECT_TIME);
            $error = curl_error($ch);
            
            $results[] = [
                'connection_id' => $handle['connection_id'],
                'status_code' => $httpCode,
                'connect_time' => $connectTime * 1000,
                'total_time' => $totalTime * 1000,
                'response_size' => strlen($body),
                'success' => $httpCode >= 200 && $httpCode < 400 && empty($error),
                'error' => $error,
                'events_received' => substr_count($body, 'data:')
            ];
            
            curl_multi_remove_handle($multiHandle, $ch);
            curl_close($ch);
        }
        
        curl_multi_close($multiHandle);
        
        $endTime = microtime(true);
        $totalDuration = $endTime - $startTime;
        
        return $this->generateSSEReport($results, $totalDuration, $concurrentConnections);
    }
    
    /**
     * Generate SSE test report
     */
    private function generateSSEReport($results, $totalDuration, $concurrentConnections) {
        $successfulConnections = array_filter($results, fn($r) => $r['success']);
        $failedConnections = array_filter($results, fn($r) => !$r['success']);
        
        $connectTimes = array_column($results, 'connect_time');
        $totalTimes = array_column($results, 'total_time');
        $eventsReceived = array_column($results, 'events_received');
        
        $report = [
            'total_connections' => count($results),
            'successful_connections' => count($successfulConnections),
            'failed_connections' => count($failedConnections),
            'success_rate' => count($successfulConnections) / count($results) * 100,
            'total_duration' => $totalDuration,
            'concurrent_connections' => $concurrentConnections,
            'avg_connect_time' => array_sum($connectTimes) / count($connectTimes),
            'avg_total_time' => array_sum($totalTimes) / count($totalTimes),
            'min_connect_time' => min($connectTimes),
            'max_connect_time' => max($connectTimes),
            'min_total_time' => min($totalTimes),
            'max_total_time' => max($totalTimes),
            'total_events_received' => array_sum($eventsReceived),
            'avg_events_per_connection' => array_sum($eventsReceived) / count($results)
        ];
        
        return $report;
    }
    
    /**
     * Print SSE test report
     */
    public function printSSEReport($report) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "SSE LOAD TEST RESULTS\n";
        echo str_repeat("=", 60) . "\n";
        echo "Total Connections: {$report['total_connections']}\n";
        echo "Successful Connections: {$report['successful_connections']}\n";
        echo "Failed Connections: {$report['failed_connections']}\n";
        echo "Success Rate: " . number_format($report['success_rate'], 2) . "%\n";
        echo "Test Duration: " . number_format($report['total_duration'], 2) . " seconds\n";
        echo "Concurrent Connections: {$report['concurrent_connections']}\n";
        echo "Average Connect Time: " . number_format($report['avg_connect_time'], 2) . " ms\n";
        echo "Average Total Time: " . number_format($report['avg_total_time'], 2) . " ms\n";
        echo "Min Connect Time: " . number_format($report['min_connect_time'], 2) . " ms\n";
        echo "Max Connect Time: " . number_format($report['max_connect_time'], 2) . " ms\n";
        echo "Min Total Time: " . number_format($report['min_total_time'], 2) . " ms\n";
        echo "Max Total Time: " . number_format($report['max_total_time'], 2) . " ms\n";
        echo "Total Events Received: {$report['total_events_received']}\n";
        echo "Average Events per Connection: " . number_format($report['avg_events_per_connection'], 2) . "\n";
        echo str_repeat("=", 60) . "\n";
    }
    
    /**
     * Test different SSE load scenarios
     */
    public function testSSEScenarios() {
        echo "Testing SSE connections under different load scenarios...\n\n";
        
        $scenarios = [
            ['connections' => 5, 'duration' => 15, 'name' => 'Light Load'],
            ['connections' => 20, 'duration' => 30, 'name' => 'Medium Load'],
            ['connections' => 50, 'duration' => 45, 'name' => 'Heavy Load'],
            ['connections' => 100, 'duration' => 60, 'name' => 'Stress Test']
        ];
        
        foreach ($scenarios as $scenario) {
            echo "\n" . str_repeat("*", 60) . "\n";
            echo "TESTING {$scenario['name']} ({$scenario['connections']} connections)\n";
            echo str_repeat("*", 60) . "\n";
            
            $report = $this->testSSEMulti($scenario['connections'], $scenario['duration']);
            $this->printSSEReport($report);
            
            // Wait between tests
            sleep(5);
        }
    }
}

// Usage example
if (php_sapi_name() === 'cli') {
    $tester = new SSELoadTester();
    $tester->testSSEScenarios();
} else {
    echo "This script should be run from command line\n";
} 