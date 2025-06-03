<?php
require_once('Crud.php');
// Use an absolute path to find the config file regardless of where it's included from
require_once(dirname(__FILE__) . '/../config/timezone_config.php');

class Notification extends Crud{
  public $table = 'notification';
  public $primaryKey = 'id';
  public $fillable =  ['game_id',
                       'writer_id', 
                       'notification_type', 
                       'seen_at',
                       'read_at',
                       'created_at',
                       'message',
                       'deleted_at'
                       ];

    public function getNotifications($order = 'DESC') {
        $writer_id = $_SESSION['writer_id'];
        $sql = "SELECT n.*, g.root_text_id, t.title as game_title, 
                wt.title as winning_title 
                FROM $this->table n
                JOIN game g ON n.game_id = g.id
                JOIN text t ON g.root_text_id = t.id
                LEFT JOIN text wt ON g.winner = wt.id
                WHERE n.writer_id = :writer_id
                AND n.deleted_at IS NULL
                ORDER BY n.created_at $order";
                
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':writer_id', $writer_id);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Get notifications created after a specific timestamp
     * Used by the polling system and SSE to check for new notifications
     * Handles timezone conversions between client and server
     * 
     * @param string|null $lastCheck Timestamp to check for new notifications
     * @return array Array of notifications created after lastCheck
     */
    public function getNewNotifications($lastCheck = null, $id = null, $writerId = null) {
        // When calling this from the polling system, I send over the writerId--I can't get it from the session
        if ($writerId === null) {
            $writer_id = $_SESSION['writer_id'] ?? null;
        } else {
            $writer_id = $writerId;
        }
        if ($writer_id === null) {
            return []; // Return an empty array if the user isn't logged in
        }

        $sql = "SELECT n.*, g.root_text_id, t.title as game_title, 
                wt.title as winning_title 
                FROM $this->table n
                JOIN game g ON n.game_id = g.id
                JOIN text t ON g.root_text_id = t.id
                LEFT JOIN text wt ON g.winner = wt.id
                WHERE n.writer_id = :writer_id
                AND n.deleted_at IS NULL";
                
        if ($lastCheck !== null) {
            // Convert the lastCheck timestamp to the database timezone
            $dbLastCheck = convertToDbTimezone($lastCheck);
            
            // Use direct timestamp comparison in SQL
            $sql .= " AND n.created_at > :lastCheck";
        }

        if ($id !== null) {
            $sql .= " AND n.id = :id";
        }
        
        $sql .= " ORDER BY n.created_at ASC";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':writer_id', $writer_id);
        if ($lastCheck !== null) {
            $stmt->bindValue(':lastCheck', $dbLastCheck);
        }
        if ($id !== null) {
            $stmt->bindValue(':id', $id);
        }
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Get notifications that haven't been marked as seen
     * Used specifically for checking game state changes (e.g., game end)
     * 
     * @param int $writer_id The ID of the writer
     * @param int|null $game_id Optional game ID to filter notifications
     * @return array Array of unseen notifications
     */
    public function getUnseenNotifications($writer_id, $game_id = NULL) {
        $sql = "SELECT n.*, g.root_text_id, t.title as game_title, 
                wt.title as winning_title 
                FROM $this->table n
                JOIN game g ON n.game_id = g.id
                JOIN text t ON g.root_text_id = t.id
                LEFT JOIN text wt ON g.winner = wt.id
                WHERE n.writer_id = :writer_id AND n.seen_at IS NULL
                AND n.deleted_at IS NULL";
        
        if ($game_id !== NULL) {
            $sql .= " AND n.game_id = :game_id";
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':writer_id', $writer_id);
    
        if ($game_id !== NULL) {
            $stmt->bindValue(':game_id', $game_id);
        }
    
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function markNotificationAsSeen($user_id, $game_id) {
        $sql = "UPDATE $this->table SET seen_at = :seen_at 
                WHERE writer_id = :writer_id AND game_id = :game_id ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':writer_id', $user_id);
        $stmt->bindValue(':game_id', $game_id);
        $stmt->bindValue(':seen_at', date('Y-m-d H:i:s'));
        $stmt->execute();
    }

    /**
     * Get a specific notification by ID and writer_id
     * Used by dataFetchService when we have explicit writer_id parameter
     * 
     * @param int $notificationId The notification ID
     * @param int $writerId The writer ID
     * @return array|false The notification data or false if not found
     */
    public function getNotificationById($notificationId, $writerId) {
        $sql = "SELECT n.*, g.root_text_id, t.title as game_title, 
                wt.title as winning_title 
                FROM $this->table n
                JOIN game g ON n.game_id = g.id
                JOIN text t ON g.root_text_id = t.id
                LEFT JOIN text wt ON g.winner = wt.id
                WHERE n.id = :id 
                AND n.writer_id = :writer_id
                AND n.deleted_at IS NULL";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $notificationId);
        $stmt->bindValue(':writer_id', $writerId);
        $stmt->execute();
        return $stmt->fetch();
    }
}