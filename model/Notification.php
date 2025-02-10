<?php
 require_once('Crud.php');

 class Notification extends Crud{
   public $table = 'notification';
   public $primaryKey = 'id';
   public $fillable =  ['game_id',
                        'writer_id', 
                        'notification_type', 
                        'is_seen',
                        'created_at',
                        'message'
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
                ORDER BY n.created_at $order";
                
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':writer_id', $writer_id);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getUnseenNotifications($writer_id, $game_id = NULL) {
        $sql = "SELECT * FROM notification WHERE writer_id = :writer_id AND is_seen = FALSE";
        
        if ($game_id !== NULL) {
            $sql .= " AND game_id = :game_id";
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
        $sql = "UPDATE notifications SET is_seen = TRUE 
                WHERE user_id = :user_id AND game_id = :game_id ";
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':user_id', $user_id);
        $stmt->bindValue(':game_id', $game_id);
        $stmt->execute();
    }
}