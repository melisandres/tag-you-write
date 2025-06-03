<?php

RequirePage::model('WriterActivity');

class ControllerWriterActivity extends Controller {

    /**
     * Index method - required by base Controller class
     * Returns current activity overview
     */
    public function index() {
        try {
            $writerActivity = new WriterActivity();
            $gameActivities = $writerActivity->getGameActivityCounts();
            
            echo json_encode([
                'game_activities' => $gameActivities,
                'timestamp' => time()
            ]);
        } catch (Exception $e) {
            error_log("WriterActivity index error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error']);
        }
    }

    /**
     * Store or update writer activity (heartbeat endpoint)
     * This is called frequently by the frontend to track user activity
     */
    public function storeOrUpdate() {
        try {
            // Log connection stats periodically (every 10th request)
            if (rand(1, 10) === 1) {
                DatabaseConnection::logStats();
            }
            
            // Get JSON input
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            // Get writer ID from session
            $writerId = $_SESSION['writer_id'] ?? null;
            
            if (!$writerId) {
                http_response_code(401);
                echo json_encode(['error' => 'User not authenticated']);
                return;
            }

            // Validate required fields
            $requiredFields = ['activity_type', 'activity_level', 'page_type'];
            foreach ($requiredFields as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Missing required field: $field"]);
                    return;
                }
            }

            // Validate activity_type (updated to exclude 'idle')
            $validActivityTypes = ['browsing', 'iterating', 'starting_game', 'adding_note'];
            if (!in_array($input['activity_type'], $validActivityTypes)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid activity_type']);
                return;
            }

            // Validate activity_level (new field)
            $validActivityLevels = ['active', 'idle'];
            if (!in_array($input['activity_level'], $validActivityLevels)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid activity_level']);
                return;
            }

            // Validate page_type
            $validPageTypes = ['game_list', 'text_form', 'collab_page', 'home', 'other'];
            if (!in_array($input['page_type'], $validPageTypes)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid page_type']);
                return;
            }

            // Prepare data for storage (including activity_level)
            $activityData = [
                'writer_id' => $writerId,
                'activity_type' => $input['activity_type'],
                'activity_level' => $input['activity_level'],
                'page_type' => $input['page_type'],
                'game_id' => $input['game_id'] ?? null,
                'text_id' => $input['text_id'] ?? null,
                'parent_id' => $input['parent_id'] ?? null,
                'session_id' => session_id()
            ];

            // Store/update in database
            $writerActivity = new WriterActivity();
            $success = $writerActivity->storeOrUpdate($activityData);

            if ($success) {
                // Publish to Redis if available - using existing pattern
                $this->publishToRedis($activityData);
                
                echo json_encode(['success' => true]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to store activity']);
            }

        } catch (Exception $e) {
            error_log("WriterActivity storeOrUpdate error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error']);
        }
    }

    /**
     * Get activities since a specific timestamp
     * Used by polling systems to fetch activity updates
     */
    public function getActivitiesSince() {
        try {
            $lastCheck = $_GET['lastCheck'] ?? null;
            $gameId = $_GET['gameId'] ?? null;
            $textId = $_GET['textId'] ?? null;

            $writerActivity = new WriterActivity();
            $activities = $writerActivity->getActivitiesSince($lastCheck, $gameId, $textId);

            echo json_encode([
                'activities' => $activities,
                'timestamp' => time()
            ]);

        } catch (Exception $e) {
            error_log("WriterActivity getActivitiesSince error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error']);
        }
    }

    /**
     * Get activity counts for games (for game list display)
     */
    public function getGameActivityCounts() {
        try {
            $writerActivity = new WriterActivity();
            $counts = $writerActivity->getGameActivityCounts();

            // Transform to associative array for easier frontend consumption
            $result = [];
            foreach ($counts as $count) {
                $result[$count['game_id']] = [
                    'total_users' => (int)$count['total_users'],
                    'editing_users' => (int)$count['editing_users'],
                    'browsing_users' => (int)$count['browsing_users']
                ];
            }

            echo json_encode($result);

        } catch (Exception $e) {
            error_log("WriterActivity getGameActivityCounts error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error']);
        }
    }

    /**
     * Get activity counts for texts (for tree/shelf visualization)
     */
    public function getTextActivityCounts() {
        try {
            $gameId = $_GET['gameId'] ?? null;
            
            $writerActivity = new WriterActivity();
            $counts = $writerActivity->getTextActivityCounts($gameId);

            // Transform to associative array for easier frontend consumption
            $result = [];
            foreach ($counts as $count) {
                $result[$count['text_id']] = [
                    'total_users' => (int)$count['total_users'],
                    'editing_users' => (int)$count['editing_users'],
                    'browsing_users' => (int)$count['browsing_users'],
                    'user_names' => explode(',', $count['user_names'])
                ];
            }

            echo json_encode($result);

        } catch (Exception $e) {
            error_log("WriterActivity getTextActivityCounts error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error']);
        }
    }

    /**
     * Publish activity update to Redis for real-time updates
     * Following the pattern used in other controllers
     */
    private function publishToRedis($activityData) {
        try {
            // Load Redis manager if available
            if (file_exists('services/RedisManager.php')) {
                require_once('services/RedisManager.php');
                
                if (class_exists('RedisManager')) {
                    $redisManager = new RedisManager();
                    
                    if ($redisManager->isAvailable()) {
                        // Publish to activity channels
                        $message = json_encode([
                            'type' => 'activity_update',
                            'data' => $activityData,
                            'timestamp' => time()
                        ]);
                        
                        // Publish to general activity channel
                        $redisManager->publish('activities:updates', $message);
                        
                        // Publish to game-specific channel if game_id exists
                        if ($activityData['game_id']) {
                            $redisManager->publish('activities:game:' . $activityData['game_id'], $message);
                        }
                        
                        // Publish to text-specific channel if text_id exists
                        if ($activityData['text_id']) {
                            $redisManager->publish('activities:text:' . $activityData['text_id'], $message);
                        }
                    }
                }
            }
        } catch (Exception $e) {
            // Log but don't fail the request if Redis publishing fails
            error_log("Failed to publish activity update to Redis: " . $e->getMessage());
        }
    }

    /**
     * Cleanup old activities (can be called by cron job)
     */
    public function cleanup() {
        try {
            $minutes = $_GET['minutes'] ?? 30;
            
            $writerActivity = new WriterActivity();
            $deleted = $writerActivity->cleanupOldActivities($minutes);

            echo json_encode([
                'success' => true,
                'deleted_records' => $deleted
            ]);

        } catch (Exception $e) {
            error_log("WriterActivity cleanup error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error']);
        }
    }

    /**
     * Get activity counts for the current context
     * Used by the frontend activity indicator
     */
    public function getActivityCounts() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $gameId = $input['game_id'] ?? null;
            $textId = $input['text_id'] ?? null;
            $pageType = $input['page_type'] ?? null;

            $writerActivity = new WriterActivity();
            
            $counts = $writerActivity->getActivityCounts($gameId, $textId, $pageType);
            
            header('Content-Type: application/json');
            echo json_encode($counts);
            
        } catch (Exception $e) {
            error_log("Error getting activity counts: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get activity counts']);
        }
    }

    /**
     * Test endpoint for activity manager testing (no authentication required)
     * This is for development/testing purposes only
     */
    public function testStore() {
        try {
            // Get JSON input
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            // For testing, use the writer_id from the payload instead of session
            $writerId = $input['writer_id'] ?? null;
            
            if (!$writerId) {
                http_response_code(400);
                echo json_encode(['error' => 'writer_id required in payload for testing']);
                return;
            }

            // Validate required fields
            $requiredFields = ['activity_type', 'activity_level', 'page_type'];
            foreach ($requiredFields as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Missing required field: $field"]);
                    return;
                }
            }

            // Validate activity_type
            $validActivityTypes = ['browsing', 'editing', 'starting_game'];
            if (!in_array($input['activity_type'], $validActivityTypes)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid activity_type']);
                return;
            }

            // Validate activity_level
            $validActivityLevels = ['active', 'idle'];
            if (!in_array($input['activity_level'], $validActivityLevels)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid activity_level']);
                return;
            }

            // Validate page_type
            $validPageTypes = ['game_list', 'text_form', 'collab_page', 'home', 'other'];
            if (!in_array($input['page_type'], $validPageTypes)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid page_type']);
                return;
            }

            // Prepare data for storage
            $activityData = [
                'writer_id' => $writerId,
                'activity_type' => $input['activity_type'],
                'activity_level' => $input['activity_level'],
                'page_type' => $input['page_type'],
                'game_id' => $input['game_id'] ?? null,
                'text_id' => $input['text_id'] ?? null,
                'parent_id' => $input['parent_id'] ?? null,
                'session_id' => 'test_session_' . $writerId
            ];

            // Store/update in database
            $writerActivity = new WriterActivity();
            $success = $writerActivity->storeOrUpdate($activityData);

            if ($success) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Activity stored successfully',
                    'data' => $activityData
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to store activity']);
            }

        } catch (Exception $e) {
            error_log("WriterActivity testStore error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
        }
    }
}
?> 