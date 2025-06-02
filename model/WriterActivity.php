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
    public function getActivitiesSince($lastCheck = null, $gameId = null, $textId = null) {
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

    /**
     * Get current activity counts for games
     * Returns array of game_id => activity_count
     */
    public function getGameActivityCounts() {
        $sql = "SELECT game_id, 
                       COUNT(*) as total_users,
                       SUM(CASE WHEN activity_type = 'editing' THEN 1 ELSE 0 END) as editing_users,
                       SUM(CASE WHEN activity_type = 'browsing' THEN 1 ELSE 0 END) as browsing_users
                FROM $this->table 
                WHERE game_id IS NOT NULL 
                AND last_heartbeat > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                GROUP BY game_id";
        
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Get current activity for specific texts (for tree/shelf visualization)
     */
    public function getTextActivityCounts($gameId = null) {
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
    public function getActivityCounts($gameId = null, $textId = null, $pageType = null) {
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
    }
}
?> 