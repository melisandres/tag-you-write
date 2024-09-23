<?php
 require_once('Crud.php');

 class Game extends Crud{
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

   public function getGames($order = null) {
      $loggedInWriterId = isset($_SESSION['writer_id']) ? $_SESSION['writer_id'] : "";
   
      $sql =   "SELECT g.id AS game_id, 
                        g.prompt,
                        rt.id AS id,
                        rt.title AS title,
                        SUM(CASE WHEN t.status_id != 1 AND t.writer_id != :loggedInWriterId THEN 1 ELSE 0 END) AS text_count,
                        SUM(CASE WHEN s.text_id IS NOT NULL AND t.status_id != 1 AND t.writer_id != :loggedInWriterId AND (t.note_date IS NULL OR s.read_at > t.note_date) THEN 1 ELSE 0 END) AS seen_count,
                        SUM(CASE WHEN s.text_id IS NULL AND t.status_id != 1 AND t.writer_id != :loggedInWriterId THEN 1 ELSE 0 END) AS unseen_count,
                        (CASE WHEN EXISTS (
                           SELECT 1
                           FROM text t2
                           WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId
                        ) THEN 1 ELSE 0 END) AS hasContributed
                  FROM game g
                  INNER JOIN text rt ON g.id = rt.game_id AND rt.parent_id IS NULL
                  INNER JOIN text_status ts ON rt.status_id = ts.id AND 
                        (ts.status != 'draft' OR (ts.status = 'draft' AND rt.writer_id = :loggedInWriterId))
                  INNER JOIN text t ON g.id = t.game_id
                  LEFT JOIN seen s ON t.id = s.text_id AND s.writer_id = :loggedInWriterId
                  GROUP BY g.id, g.prompt, rt.id, rt.title";
      
      if ($order) {
         $sql .= " ORDER BY hasContributed DESC, $this->primaryKey $order";
     } else {
         $sql .= " ORDER BY hasContributed DESC";
     }
      
      $stmt = $this->prepare($sql);
      $stmt->bindValue(':loggedInWriterId', $loggedInWriterId);
      $stmt->execute();
      
      $games = $stmt->fetchAll();
   
      // Add logic to determine if there are any unseen texts
      foreach ($games as &$game) {
            $game['hasUnseenTexts'] = ($game['unseen_count'] > 0) ? true : false;
      }
   
      return $games;
   }

   public function getPlayers($game_id) {
      // Fetch all players involved in the game
      $sql = "SELECT writer_id 
               FROM text 
               WHERE game_id = :game_id";
      $stmt = $this->prepare($sql);
      $stmt->bindValue(':game_id', $game_id);
      $stmt->execute();
      return $stmt->fetchAll();
  }
}