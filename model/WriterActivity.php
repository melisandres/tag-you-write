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
     * Get all currently active users for initialization
     * Returns array of user activity records matching the SSE userActivityUpdate format
     * 
     * @return array Array of user activity records
     */
    public function getAllActiveUsers() {
        $sql = "SELECT 
                    writer_id,
                    activity_type,
                    activity_level,
                    page_type,
                    game_id,
                    text_id,
                    parent_id,
                    UNIX_TIMESTAMP(last_heartbeat) as timestamp
                FROM $this->table
                WHERE last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                AND activity_level = 'active'
                ORDER BY last_heartbeat DESC";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Convert to consistent format (strings for IDs, numbers for numeric fields)
        foreach ($results as &$result) {
            $result['writer_id'] = (string)$result['writer_id'];
            $result['game_id'] = $result['game_id'] ? (string)$result['game_id'] : null;
            $result['text_id'] = $result['text_id'] ? (string)$result['text_id'] : null;
            $result['parent_id'] = $result['parent_id'] ? (string)$result['parent_id'] : null;
            $result['timestamp'] = (int)$result['timestamp'];
        }
        
            return $results;

    }
}
?> 