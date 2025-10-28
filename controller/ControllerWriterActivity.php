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
            $userActivities = $writerActivity->getAllActiveUsers();
            
            echo json_encode([
                'user_activities' => $userActivities,
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

            // Validate activity_type (updated to include 'other' for general pages)
            $validActivityTypes = ['browsing', 'iterating', 'starting_game', 'adding_note', 'other'];
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
                // PHASE 2: Use only the direct Redis method (no events table flooding)
                $this->publishActivityUpdateDirect($activityData);
                
                // OLD METHOD DISABLED: Floods events table and causes race conditions
                // $this->publishActivityUpdate($activityData);
                
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
     * Get all currently active users for UserActivityDataManager initialization
     * Returns array of user activity records in the same format as SSE userActivityUpdate events
     */
    public function getAllActiveUsers() {
        try {
            $writerActivity = new WriterActivity();
            $activeUsers = $writerActivity->getAllActiveUsers();
            
            header('Content-Type: application/json');
            echo json_encode($activeUsers);
            
        } catch (Exception $e) {
            error_log("Error getting all active users: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get active users']);
        }
    }

    /**
     * Publish user activity update directly to Redis (user-centric tracking only)
     * This approach avoids flooding the events table with heartbeats
     */
    private function publishActivityUpdateDirect($activityData) {
        try {
            // Load RedisManager if available
            if (file_exists('services/RedisManager.php')) {
                require_once('services/RedisManager.php');
                
                if (class_exists('RedisManager')) {
                    $redisManager = new RedisManager();
                    
                    if ($redisManager->isAvailable()) {
                        // Create user activity message for user-centric tracking
                        $userActivityMessage = [
                            'type' => 'user_activity_update',
                            'data' => [
                                'writer_id' => $activityData['writer_id'],
                                'activity_type' => $activityData['activity_type'],
                                'activity_level' => $activityData['activity_level'],
                                'page_type' => $activityData['page_type'],
                                'game_id' => $activityData['game_id'],
                                'text_id' => $activityData['text_id'],
                                'parent_id' => $activityData['parent_id'],
                                'timestamp' => time()
                            ],
                            'source' => 'heartbeat',
                            'timestamp' => time(),
                            'writer_id' => $activityData['writer_id']
                        ];
                        
                        // Publish user activity message
                        $userResult = $redisManager->publish('users:activity', $userActivityMessage);
                        
                        // Log success (reduced logging - only log every 5th heartbeat)
                        static $logCount = 0;
                        $logCount++;
                        
                        if ($logCount % 5 === 0) {
                            error_log("ActivityUpdate: User activity published for writer_id: " . $activityData['writer_id'] . 
                                     " (user: $userResult subscribers)");
                        }
                        
                        return ($userResult > 0);
                    } else {
                        error_log("ActivityUpdate: Redis not available for direct publishing");
                        return false;
                    }
                } else {
                    error_log("ActivityUpdate: RedisManager class not found");
                    return false;
                }
            } else {
                error_log("ActivityUpdate: RedisManager.php not found");
                return false;
            }
        } catch (Exception $e) {
            error_log("ActivityUpdate: Exception in publishActivityUpdateDirect: " . $e->getMessage());
            return false;
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
}
?> 