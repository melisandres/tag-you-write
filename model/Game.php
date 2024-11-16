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
                        'public',
                        'modified_at'
                        ];

   public function getGames($order = null) {
      $loggedInWriterId = isset($_SESSION['writer_id']) ? $_SESSION['writer_id'] : "";
   
      $sql =   "SELECT g.id AS game_id, 
                        g.prompt,
                        g.open_for_changes AS openForChanges,
                        rt.id AS id,
                        rt.title AS title,
                        ts.status AS root_text_status,
                        SUM(CASE WHEN t.status_id = 2 AND t.writer_id != :loggedInWriterId THEN 1 ELSE 0 END) AS text_count,
                        SUM(CASE WHEN s.text_id IS NOT NULL AND t.status_id = 2 AND t.writer_id != :loggedInWriterId AND (t.note_date IS NULL OR s.read_at > t.note_date) THEN 1 ELSE 0 END) AS seen_count,
                        SUM(CASE WHEN s.text_id IS NULL AND t.status_id = 2 AND t.writer_id != :loggedInWriterId THEN 1 ELSE 0 END) AS unseen_count,
                        (CASE WHEN EXISTS (
                           SELECT 1
                           FROM text t2
                           WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId
                        ) THEN 1 ELSE 0 END) AS hasContributed
                  FROM game g
                  INNER JOIN text rt ON g.id = rt.game_id AND rt.parent_id IS NULL
                  INNER JOIN text_status ts ON rt.status_id = ts.id AND 
                        (ts.status = 'published' OR (ts.status = 'draft' AND rt.writer_id = :loggedInWriterId) OR (ts.status = 'incomplete_draft' AND rt.writer_id = :loggedInWriterId)) 
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
            $game['pending'] = ($game['root_text_status'] == 'draft' || $game['root_text_status'] == 'incomplete_draft') ? true : false;
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

  public function getModifiedSince($lastCheck) {
   // Debug timestamp comparison
   $debugSql = "SELECT g.id, 
          g.modified_at,
          :lastCheck as check_time,
          CASE 
              WHEN CAST(g.modified_at AS DATETIME) > CAST(:lastCheck AS DATETIME) THEN 'YES'
              ELSE 'NO'
          END as is_newer,
          TIMESTAMPDIFF(SECOND, CAST(:lastCheck AS DATETIME), CAST(g.modified_at AS DATETIME)) as seconds_diff
          FROM game g
          WHERE g.modified_at IS NOT NULL";
   
   $debugStmt = $this->prepare($debugSql);
   $debugStmt->bindValue(':lastCheck', $lastCheck);
   $debugStmt->execute();
   error_log("Timestamp comparison debug: " . print_r($debugStmt->fetchAll(PDO::FETCH_ASSOC), true));

   // Debug the basic game query first
   $basicSql = "SELECT g.id, g.prompt, g.modified_at
                FROM game g
                WHERE CAST(g.modified_at AS DATETIME) > CAST(:lastCheck AS DATETIME)";
   
   $basicStmt = $this->prepare($basicSql);
   $basicStmt->bindValue(':lastCheck', $lastCheck);
   $basicStmt->execute();
   error_log("Basic game query results: " . print_r($basicStmt->fetchAll(PDO::FETCH_ASSOC), true));

   // Now try with the text join
   $sql = "SELECT g.id, g.prompt, g.modified_at, g.open_for_changes,
           t.id as text_id, t.title, t.writer_id
           FROM game g
           LEFT JOIN text t ON g.id = t.game_id AND t.parent_id IS NULL
           WHERE CAST(g.modified_at AS DATETIME) > CAST(:lastCheck AS DATETIME)";
   
   error_log("Full SQL query: " . $sql);
   error_log("lastCheck value: " . $lastCheck);
   
   $stmt = $this->prepare($sql);
   $stmt->bindValue(':lastCheck', $lastCheck);
   $stmt->execute();
   
   $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
   
   if (!empty($results)) {
       foreach ($results as &$game) {
           if ($game['text_id']) {
               // Get text count
               $textCountSql = "SELECT COUNT(*) FROM text WHERE parent_id = :text_id";
               $textStmt = $this->prepare($textCountSql);
               $textStmt->bindValue(':text_id', $game['text_id']);
               $textStmt->execute();
               $game['text_count'] = (int)$textStmt->fetchColumn();

               // Get seen count
               $seenCountSql = "SELECT COUNT(*) 
                               FROM text_seen ts 
                               INNER JOIN text child ON child.parent_id = :text_id 
                               WHERE ts.text_id = child.id
                               AND ts.writer_id = :writer_id";
               $seenStmt = $this->prepare($seenCountSql);
               $seenStmt->bindValue(':text_id', $game['text_id']);
               $seenStmt->bindValue(':writer_id', isset($_SESSION['writer_id']) ? $_SESSION['writer_id'] : 0);
               $seenStmt->execute();
               $game['seen_count'] = (int)$textStmt->fetchColumn();
               // Calculate unseen count
               $game['unseen_count'] = $game['text_count'] - $game['seen_count'];
            } else {
               $game['text_count'] = 0;
               $game['seen_count'] = 0;
               $game['unseen_count'] = 0;
            }
      }
   }
   error_log("Final results: " . print_r($results, true));
   return $results;
}


   public function getRootText($game_id) {
      $sql = "SELECT root_text_id FROM game WHERE id = :game_id";
      $stmt = $this->prepare($sql);
      $stmt->bindValue(':game_id', $game_id);
      $stmt->execute();
      return $stmt->fetchColumn();
   }
}
