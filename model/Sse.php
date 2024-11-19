<?php
 require_once('Crud.php');

 class Sse extends Crud{
   public $table = 'game';
   public $primaryKey = 'id';
   public $fillable = ['cadaver_id',
                        'root_text_id',
                        'prompt',
                        'phase',
                        'open_for_changes',
                        'open_for_writers',
                        'winner',
                        'mvp',
                        'public'
                        ];

    public function checkForNewStories($lastId) {
        $query = "SELECT id, title 
                  FROM stories 
                  WHERE id > ? 
                  ORDER BY id ASC";
        $stmt = $this->prepare($query);
        $stmt->execute([$lastId]);
        return $stmt->fetchAll();
    }

    public function getModifiedGameIds($lastCheck, $gameIds = []) {
        $sql = "SELECT id, modified_at 
                FROM game 
                WHERE modified_at > :lastCheck";
        
        // If specific games are being watched, add them to the query
        if (!empty($gameIds)) {
            $sql .= " AND id IN (" . str_repeat('?,', count($gameIds) - 1) . "?)";
        }
        
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':lastCheck', $lastCheck);
        
        // Bind game IDs if they exist
        if (!empty($gameIds)) {
            foreach ($gameIds as $index => $id) {
                $stmt->bindValue($index + 1, $id);
            }
        }
        
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
 
}