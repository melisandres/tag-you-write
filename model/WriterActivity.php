<?php
require_once('Crud.php');

class WriterActivity extends Crud {
    public $table = 'writer_activity';
    public $primaryKey = 'id';
    public $fillable = [
        'writer_id',
        'activity_type',
        'activity_level',
        'page_type', 
        'game_id',
        'text_id',
        'parent_id',
        'session_id',
        'last_heartbeat'
    ];

    /**
     * Store or update writer activity (upsert operation)
     * Since writer_id should be unique, we update if exists, insert if not
     */
    public function storeOrUpdate($data) {
        $sql = "INSERT INTO $this->table 
                (writer_id, activity_type, activity_level, page_type, game_id, text_id, parent_id, session_id, last_heartbeat)
                VALUES (:writer_id, :activity_type, :activity_level, :page_type, :game_id, :text_id, :parent_id, :session_id, NOW())
                ON DUPLICATE KEY UPDATE
                activity_type = VALUES(activity_type),
                activity_level = VALUES(activity_level),
                page_type = VALUES(page_type),
                game_id = VALUES(game_id),
                text_id = VALUES(text_id),
                parent_id = VALUES(parent_id),
                session_id = VALUES(session_id),
                last_heartbeat = NOW()";

        $stmt = $this->pdo->prepare($sql);
        
        // Bind parameters with null handling
        $stmt->bindValue(':writer_id', $data['writer_id']);
        $stmt->bindValue(':activity_type', $data['activity_type']);
        $stmt->bindValue(':activity_level', $data['activity_level']);
        $stmt->bindValue(':page_type', $data['page_type']);
        $stmt->bindValue(':game_id', $data['game_id'] ?? null);
        $stmt->bindValue(':text_id', $data['text_id'] ?? null);
        $stmt->bindValue(':parent_id', $data['parent_id'] ?? null);
        $stmt->bindValue(':session_id', $data['session_id'] ?? null);
        
        return $stmt->execute();
    }

    /**
     * Get activities since a specific timestamp
     * Used by polling systems to fetch recent activity changes
     */
   /*  public function getActivitiesSince($lastCheck = null, $gameId = null, $textId = null) {
        $sql = "SELECT wa.*, w.firstName, w.lastName 
                FROM $this->table wa
                LEFT JOIN writer w ON wa.writer_id = w.id
                WHERE 1=1";
        
        $params = [];
        
        if ($lastCheck !== null) {
            $sql .= " AND wa.last_heartbeat > :lastCheck";
            $params[':lastCheck'] = $lastCheck;
        }
        
        if ($gameId !== null) {
            $sql .= " AND wa.game_id = :gameId";
            $params[':gameId'] = $gameId;
        }
        
        if ($textId !== null) {
            $sql .= " AND wa.text_id = :textId";
            $params[':textId'] = $textId;
        }
        
        // Only show activities from last 5 minutes to avoid stale data
        $sql .= " AND wa.last_heartbeat > DATE_SUB(NOW(), INTERVAL 5 MINUTE)";
        $sql .= " ORDER BY wa.last_heartbeat DESC";
        
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        return $stmt->fetchAll();
    }
 */
    /**
     * Get activity counts grouped by game for real-time game activity tracking
     * Returns counts of active users per game for collaborative awareness
     * 
     * @param int|null $gameId Optional game ID to filter by specific game
     * @return array Structure with games array and timestamp
     */
    public function getGameActivityCounts($gameId = null) {
        if ($gameId !== null) {
            // Scoped query for specific game only (used by heartbeat publishing)
            $sql = "SELECT 
                        CASE 
                            WHEN activity_type IN ('iterating', 'adding_note', 'starting_game') THEN 'writing'
                            ELSE 'browsing'
                        END as activity_category,
                        COUNT(DISTINCT writer_id) as count
                    FROM writer_activity 
                    WHERE last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                    AND activity_level = 'active'
                    AND game_id = :game_id
                    GROUP BY activity_category";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':game_id', $gameId);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Initialize structure for single game
            $gameActivities = [
                'game_id' => $gameId,
                'browsing' => 0,
                'writing' => 0,
                'timestamp' => time()
            ];
            
            // Process results for this specific game
            foreach ($results as $row) {
                $category = $row['activity_category'];
                $count = (int)$row['count'];
                $gameActivities[$category] = $count;
            }
            
            return $gameActivities;
        } else {
            // Original query for all games (used by initialization/polling)
            $sql = "SELECT 
                        game_id,
                        CASE 
                            WHEN activity_type IN ('iterating', 'adding_note', 'starting_game') THEN 'writing'
                            ELSE 'browsing'
                        END as activity_category,
                        COUNT(DISTINCT writer_id) as count
                    FROM writer_activity 
                    WHERE last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                    AND activity_level = 'active'
                    AND game_id IS NOT NULL
                    GROUP BY game_id, activity_category";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Initialize structure for all games
            $gameActivities = [
                'games' => [],
                'timestamp' => time()
            ];
            
            // Process results and build per-game counts
            foreach ($results as $row) {
                $gameId = $row['game_id'];
                $category = $row['activity_category'];
                $count = (int)$row['count'];
                
                // Initialize game entry if not exists
                if (!isset($gameActivities['games'][$gameId])) {
                    $gameActivities['games'][$gameId] = [
                        'browsing' => 0,
                        'writing' => 0
                    ];
                }
                
                // Set the count for this category
                $gameActivities['games'][$gameId][$category] = $count;
            }
            
            return $gameActivities;
        }
    }

    /**
     * Get current activity for specific texts (for tree/shelf visualization)
     * Returns aggregated counts per text_id
     */
   /*  public function getTextActivityCounts($gameId = null) {
        $sql = "SELECT text_id,
                       COUNT(*) as total_users,
                       SUM(CASE WHEN activity_type = 'editing' THEN 1 ELSE 0 END) as editing_users,
                       SUM(CASE WHEN activity_type = 'browsing' THEN 1 ELSE 0 END) as browsing_users,
                       GROUP_CONCAT(CONCAT(COALESCE(w.firstName, 'Anonymous'), ' ', COALESCE(w.lastName, ''))) as user_names
                FROM $this->table wa
                LEFT JOIN writer w ON wa.writer_id = w.id
                WHERE text_id IS NOT NULL 
                AND last_heartbeat > DATE_SUB(NOW(), INTERVAL 5 MINUTE)";
        
        if ($gameId !== null) {
            $sql .= " AND game_id = :gameId";
        }
        
        $sql .= " GROUP BY text_id";
        
        $stmt = $this->pdo->prepare($sql);
        
        if ($gameId !== null) {
            $stmt->bindValue(':gameId', $gameId);
        }
        
        $stmt->execute();
        return $stmt->fetchAll();
    } */

    /**
     * Get individual user activities for a specific game (for real-time activity tracking)
     * Returns array of individual user activity records with consistent data structure
     * 
     * @param int|null $gameId Game ID to filter by
     * @return array Array of individual user activity records
     */
    public function getIndividualTextActivities($gameId = null) {
        $sql = "SELECT 
                    writer_id,
                    activity_type,
                    activity_level,
                    text_id,
                    parent_id,
                    UNIX_TIMESTAMP(last_heartbeat) as timestamp
                FROM $this->table
                WHERE last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                AND activity_level = 'active'
                AND text_id IS NOT NULL";
        
        if ($gameId !== null) {
            $sql .= " AND game_id = :gameId";
        }
        
        $sql .= " ORDER BY last_heartbeat DESC";
        
        $stmt = $this->pdo->prepare($sql);
        
        if ($gameId !== null) {
            $stmt->bindValue(':gameId', $gameId);
        }
        
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert string values to appropriate types
        foreach ($results as &$result) {
            $result['writer_id'] = (int)$result['writer_id'];
            $result['text_id'] = $result['text_id'] ? (int)$result['text_id'] : null;
            $result['parent_id'] = $result['parent_id'] ? (int)$result['parent_id'] : null;
            $result['timestamp'] = (int)$result['timestamp'];
        }
        
        return $results;
    }

    /**
     * Clean up old activity records (run periodically)
     */
    public function cleanupOldActivities($olderThanMinutes = 30) {
        $sql = "DELETE FROM $this->table 
                WHERE last_heartbeat < DATE_SUB(NOW(), INTERVAL :minutes MINUTE)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':minutes', $olderThanMinutes);
        return $stmt->execute();
    }

    /**
     * Get activity counts for a specific context
     * 
     * @param int|null $gameId Game ID to filter by
     * @param int|null $textId Text ID to filter by  
     * @param string|null $pageType Page type to filter by
     * @return array Activity counts by type and level
     */
   /*  public function getActivityCounts($gameId = null, $textId = null, $pageType = null) {
        $sql = "SELECT 
                    activity_type,
                    activity_level,
                    COUNT(DISTINCT writer_id) as count
                FROM writer_activity 
                WHERE last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)";
        
        $params = [];
        
        // Add context filters if provided
        if ($gameId !== null) {
            $sql .= " AND game_id = ?";
            $params[] = $gameId;
        }
        
        if ($textId !== null) {
            $sql .= " AND text_id = ?";
            $params[] = $textId;
        }
        
        if ($pageType !== null) {
            $sql .= " AND page_type = ?";
            $params[] = $pageType;
        }
        
        $sql .= " GROUP BY activity_type, activity_level";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Initialize counts with detailed breakdown
        $counts = [
            'editing' => ['active' => 0, 'idle' => 0, 'total' => 0],
            'browsing' => ['active' => 0, 'idle' => 0, 'total' => 0],
            'starting_game' => ['active' => 0, 'idle' => 0, 'total' => 0],
            'total_active' => 0,
            'total_idle' => 0,
            'total_users' => 0
        ];
        
        // Process results
        foreach ($results as $row) {
            $type = $row['activity_type'];
            $level = $row['activity_level'];
            $count = (int)$row['count'];
            
            if (isset($counts[$type])) {
                $counts[$type][$level] = $count;
                $counts[$type]['total'] += $count;
                
                if ($level === 'active') {
                    $counts['total_active'] += $count;
                } else {
                    $counts['total_idle'] += $count;
                }
                
                $counts['total_users'] += $count;
            }
        }
        
        return $counts;
    } */

    /**
     * Get site-wide activity counts for broadcasting and initialization
     * Returns simplified tallies of browsing vs writing users across the entire site
     * 
     * @return array Simple structure with browsing, writing, and timestamp
     */
    public function getSiteWideActivityCounts() {
        $sql = "SELECT 
                    CASE 
                        WHEN activity_type IN ('iterating', 'adding_note', 'starting_game') THEN 'writing'
                        ELSE 'browsing'
                    END as activity_category,
                    COUNT(DISTINCT writer_id) as count
                FROM writer_activity 
                WHERE last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                AND activity_level = 'active'
                GROUP BY activity_category";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Initialize counts
        $counts = [
            'browsing' => 0,
            'writing' => 0,
            'timestamp' => time()
        ];
        
        // Process results
        foreach ($results as $row) {
            $category = $row['activity_category'];
            $count = (int)$row['count'];
            
            if (isset($counts[$category])) {
                $counts[$category] = $count;
            }
        }
        
        return $counts;
    }
}
?> 