<?php
 require_once('Crud.php');
 require_once('config/timezone_config.php');

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
                
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':writer_id', $writer_id);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getNewNotifications($lastCheck = null) {
        $writer_id = $_SESSION['writer_id'];
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
        
        $sql .= " ORDER BY n.created_at ASC";
        
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':writer_id', $writer_id);
        if ($lastCheck !== null) {
            $stmt->bindValue(':lastCheck', $dbLastCheck);
        }
        $stmt->execute();
        return $stmt->fetchAll();
    }

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
        
        $stmt = $this->prepare($sql);
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
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':writer_id', $user_id);
        $stmt->bindValue(':game_id', $game_id);
        $stmt->bindValue(':seen_at', date('Y-m-d H:i:s'));
        $stmt->execute();
    }
}