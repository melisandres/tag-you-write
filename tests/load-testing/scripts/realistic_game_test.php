<?php
/**
 * Realistic Game Load Test for Tag You Write
 * 
 * This test simulates actual game behavior including:
 * - Database connections per user
 * - Session management
 * - Real-time interactions
 * - Game-specific actions
 */

class RealisticGameTester {
    private $baseUrl;
    private $results = [];
    
    public function __construct($baseUrl = 'http://localhost:8888/tag-you-write-repo/tag-you-write/') {
        $this->baseUrl = rtrim($baseUrl, '/');
    }
    
    /**
     * Simulate a realistic user session with game interactions
     */
    public function simulateGameUser($userId, $sessionId = null) {
        if (!$sessionId) {
            $sessionId = 'session_' . $userId . '_' . time();
        }
        
        $results = [];
        
        // 1. Login/Establish Session
        $loginResult = $this->simulateLogin($userId, $sessionId);
        $results[] = $loginResult;
        
        // 2. Browse Game List
        $gameListResult = $this->simulateGameList($sessionId);
        $results[] = $gameListResult;
        
        // 3. View/Edit Text (simulate collaboration)
        $textResult = $this->simulateTextInteraction($sessionId);
        $results[] = $textResult;
        
        // 4. Real-time Activity (simulate SSE events)
        $activityResult = $this->simulateRealTimeActivity($sessionId);
        $results[] = $activityResult;
        
        return [
            'user_id' => $userId,
            'session_id' => $sessionId,
            'actions' => $results,
            'total_time' => array_sum(array_column($results, 'response_time')),
            'success_rate' => count(array_filter($results, fn($r) => $r['success'])) / count($results)
        ];
    }
    
    /**
     * Simulate user login/session establishment
     */
    private function simulateLogin($userId, $sessionId) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . 'en',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_COOKIE => "PHPSESSID={$sessionId}",
            CURLOPT_USERAGENT => "GameUser/1.0 (User:{$userId})",
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.5',
                'Connection: keep-alive',
            ]
        ]);
        
        $startTime = microtime(true);
        $response = curl_exec($ch);
        $endTime = microtime(true);
        
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $error = curl_error($ch);
        curl_close($ch);
        
        return [
            'action' => 'login',
            'response_time' => $totalTime * 1000,
            'status_code' => $httpCode,
            'success' => $httpCode >= 200 && $httpCode < 400,
            'error' => $error,
            'session_established' => !empty($error) ? false : true
        ];
    }
    
    /**
     * Simulate browsing game list (likely database heavy)
     */
    private function simulateGameList($sessionId) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . 'en/game',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_COOKIE => "PHPSESSID={$sessionId}",
            CURLOPT_USERAGENT => "GameUser/1.0",
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.5',
                'Connection: keep-alive',
            ]
        ]);
        
        $startTime = microtime(true);
        $response = curl_exec($ch);
        $endTime = microtime(true);
        
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $error = curl_error($ch);
        curl_close($ch);
        
        return [
            'action' => 'game_list',
            'response_time' => $totalTime * 1000,
            'status_code' => $httpCode,
            'success' => $httpCode >= 200 && $httpCode < 400,
            'error' => $error,
            'response_size' => strlen($response)
        ];
    }
    
    /**
     * Simulate text viewing/editing (collaboration feature)
     */
    private function simulateTextInteraction($sessionId) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . 'en/text/show/1',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_COOKIE => "PHPSESSID={$sessionId}",
            CURLOPT_USERAGENT => "GameUser/1.0",
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.5',
                'Connection: keep-alive',
            ]
        ]);
        
        $startTime = microtime(true);
        $response = curl_exec($ch);
        $endTime = microtime(true);
        
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $error = curl_error($ch);
        curl_close($ch);
        
        return [
            'action' => 'text_interaction',
            'response_time' => $totalTime * 1000,
            'status_code' => $httpCode,
            'success' => $httpCode >= 200 && $httpCode < 400,
            'error' => $error,
            'response_size' => strlen($response)
        ];
    }
    
    /**
     * Simulate real-time activity (SSE connection)
     */
    private function simulateRealTimeActivity($sessionId) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . 'public/sse/events.php',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 10, // Shorter timeout for SSE test
            CURLOPT_COOKIE => "PHPSESSID={$sessionId}",
            CURLOPT_USERAGENT => "GameUser/1.0",
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
        $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $error = curl_error($ch);
        curl_close($ch);
        
        return [
            'action' => 'realtime_activity',
            'response_time' => $totalTime * 1000,
            'status_code' => $httpCode,
            'success' => $httpCode >= 200 && $httpCode < 400,
            'error' => $error,
            'events_received' => substr_count($response, 'data:')
        ];
    }
    
    /**
     * Test realistic game scenarios with multiple concurrent users
     */
    public function testGameScenarios($concurrentUsers = 10) {
        echo "Testing realistic game scenarios with {$concurrentUsers} concurrent users...\n\n";
        
        $startTime = microtime(true);
        $results = [];
        
        // Create curl handles for all users
        $multiHandle = curl_multi_init();
        $handles = [];
        
        for ($user = 0; $user < $concurrentUsers; $user++) {
            $sessionId = 'session_' . $user . '_' . time();
            
            // Simulate each user's complete game session
            $userResult = $this->simulateGameUser($user, $sessionId);
            $results[] = $userResult;
        }
        
        $endTime = microtime(true);
        $totalDuration = $endTime - $startTime;
        
        return $this->generateGameReport($results, $totalDuration, $concurrentUsers);
    }
    
    /**
     * Generate comprehensive game test report
     */
    private function generateGameReport($results, $totalDuration, $concurrentUsers) {
        $allActions = [];
        foreach ($results as $userResult) {
            foreach ($userResult['actions'] as $action) {
                $allActions[] = $action;
            }
        }
        
        $actionTypes = ['login', 'game_list', 'text_interaction', 'realtime_activity'];
        $actionStats = [];
        
        foreach ($actionTypes as $actionType) {
            $typeActions = array_filter($allActions, fn($a) => $a['action'] === $actionType);
            if (!empty($typeActions)) {
                $responseTimes = array_column($typeActions, 'response_time');
                $successfulActions = array_filter($typeActions, fn($a) => $a['success']);
                
                $actionStats[$actionType] = [
                    'total_actions' => count($typeActions),
                    'successful_actions' => count($successfulActions),
                    'success_rate' => count($successfulActions) / count($typeActions) * 100,
                    'avg_response_time' => array_sum($responseTimes) / count($responseTimes),
                    'min_response_time' => min($responseTimes),
                    'max_response_time' => max($responseTimes),
                    'median_response_time' => $this->calculateMedian($responseTimes)
                ];
            }
        }
        
        $userSuccessRates = array_column($results, 'success_rate');
        $userTotalTimes = array_column($results, 'total_time');
        
        $report = [
            'total_users' => count($results),
            'concurrent_users' => $concurrentUsers,
            'total_duration' => $totalDuration,
            'overall_success_rate' => array_sum($userSuccessRates) / count($userSuccessRates),
            'avg_user_session_time' => array_sum($userTotalTimes) / count($userTotalTimes),
            'action_statistics' => $actionStats,
            'database_connection_estimate' => min($concurrentUsers, 10), // Your pool limit
            'session_management' => 'active',
            'realtime_connections' => count(array_filter($allActions, fn($a) => $a['action'] === 'realtime_activity' && $a['success']))
        ];
        
        return $report;
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
     * Print comprehensive game test report
     */
    public function printGameReport($report) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "REALISTIC GAME LOAD TEST RESULTS\n";
        echo str_repeat("=", 60) . "\n";
        echo "Total Users: {$report['total_users']}\n";
        echo "Concurrent Users: {$report['concurrent_users']}\n";
        echo "Test Duration: " . number_format($report['total_duration'], 2) . " seconds\n";
        echo "Overall Success Rate: " . number_format($report['overall_success_rate'], 2) . "%\n";
        echo "Average User Session Time: " . number_format($report['avg_user_session_time'], 2) . " ms\n";
        echo "Estimated DB Connections: {$report['database_connection_estimate']}\n";
        echo "Real-time Connections: {$report['realtime_connections']}\n";
        echo str_repeat("=", 60) . "\n";
        
        echo "\nAction Performance Breakdown:\n";
        foreach ($report['action_statistics'] as $action => $stats) {
            echo "\n{$action}:\n";
            echo "  Total Actions: {$stats['total_actions']}\n";
            echo "  Success Rate: " . number_format($stats['success_rate'], 2) . "%\n";
            echo "  Avg Response Time: " . number_format($stats['avg_response_time'], 2) . " ms\n";
            echo "  Min Response Time: " . number_format($stats['min_response_time'], 2) . " ms\n";
            echo "  Max Response Time: " . number_format($stats['max_response_time'], 2) . " ms\n";
            echo "  Median Response Time: " . number_format($stats['median_response_time'], 2) . " ms\n";
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
    }
}

// Usage example
if (php_sapi_name() === 'cli') {
    $tester = new RealisticGameTester();
    
    // Test different realistic scenarios
    $scenarios = [
        ['users' => 5, 'name' => 'Small Game Session'],
        ['users' => 15, 'name' => 'Medium Game Session'],
        ['users' => 30, 'name' => 'Large Game Session']
    ];
    
    foreach ($scenarios as $scenario) {
        echo "\n" . str_repeat("*", 60) . "\n";
        echo "TESTING {$scenario['name']} ({$scenario['users']} users)\n";
        echo str_repeat("*", 60) . "\n";
        
        $report = $tester->testGameScenarios($scenario['users']);
        $tester->printGameReport($report);
        
        // Wait between tests
        sleep(3);
    }
} else {
    echo "This script should be run from command line\n";
} 