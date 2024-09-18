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
 
}