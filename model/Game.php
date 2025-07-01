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
                        'joinable_by_all',
                        'visible_to_all',
                        'winner',
                        'mvp',
                        'public',
                        'modified_at'
                        ];

   public function getGames($order = null, $filters = [], $id = null, $searchTerm = null) {
      $loggedInWriterId = isset($_SESSION['writer_id']) ? $_SESSION['writer_id'] : "";

      // Build filter string
      $filterString = "";
      
      // Handle hasContributed filter
      if (isset($filters['hasContributed'])) {
         if ($filters['hasContributed'] === true) {
            $filterString .= " AND EXISTS (
               SELECT 1 FROM text t2 
               WHERE t2.game_id = g.id 
               AND t2.writer_id = :loggedInWriterId
            )";
         } elseif ($filters['hasContributed'] === 'mine') {
            $filterString .= " AND rt.writer_id = :loggedInWriterId";
         }
      }
      
      // Handle gameState filter
      if (isset($filters['gameState']) && $filters['gameState'] !== 'all') {
         switch($filters['gameState']) {
            case 'open':
               $filterString .= " AND g.open_for_changes = 1 AND ts.status = 'published'";
               break;
            case 'closed':
               $filterString .= " AND g.open_for_changes = 0";
               break;
            case 'pending':
               $filterString .= " AND ts.status IN ('draft', 'incomplete_draft')";
               break;
         }
      }
      
      // Handle bookmarked filter
      if (isset($filters['bookmarked']) && $filters['bookmarked'] !== null) {
         if ($filters['bookmarked'] === true) {
            $filterString .= " AND b.text_id IS NOT NULL";
         } elseif ($filters['bookmarked'] === false) {
            $filterString .= " AND b.text_id IS NULL";
         }
      }
      
      // Handle gameId filter
      if ($id) {
         $filterString .= " AND g.id = :id";
      }

      // Handle search term
      if ($searchTerm) {
         $filterString .= " AND (
             g.prompt LIKE :searchTerm 
             OR rt.title LIKE :searchTerm 
             OR rt.note LIKE :searchTerm
             OR EXISTS (
                 SELECT 1 
                 FROM text search_text 
                 INNER JOIN text_status search_status ON search_text.status_id = search_status.id
                 INNER JOIN writer w ON search_text.writer_id = w.id
                 LEFT JOIN text_has_keyword thk ON search_text.id = thk.text_id
                 LEFT JOIN keyword k ON thk.keyword_id = k.id
                 WHERE search_text.game_id = g.id 
                 AND (
                     search_status.status = 'published' 
                     OR (search_status.status IN ('draft', 'incomplete_draft') 
                         AND search_text.writer_id = :loggedInWriterId)
                 )
                 AND (
                     search_text.title LIKE :searchTerm 
                     OR search_text.writing LIKE :searchTerm 
                     OR search_text.note LIKE :searchTerm
                     OR CONCAT(w.firstName, ' ', w.lastName) LIKE :searchTerm
                     OR k.word LIKE :searchTerm
                 )
             )
         )";
      }

      $sql =   "SELECT  g.id AS game_id, 
                        g.prompt,
                        g.open_for_changes AS openForChanges,
                        g.modified_at,
                        rt.id AS id,
                        rt.title AS title,
                        ts.status AS root_text_status,
                        @row_num := @row_num + 1 AS placement_index,
                        SUM(CASE 
                            WHEN t.status_id = 2 THEN 1 ELSE 0 END) AS text_count,
                        SUM(CASE 
                            WHEN t.status_id = 2 AND (
                                t.writer_id = :loggedInWriterId OR                    
                                (s.text_id IS NOT NULL AND                           
                                 (t.note_date IS NULL OR s.read_at > t.note_date))   
                            ) THEN 1 ELSE 0 END) AS seen_count,
                        SUM(CASE 
                            WHEN t.status_id = 2 AND 
                                 t.writer_id != :loggedInWriterId AND                
                                 (s.text_id IS NULL OR                               
                                  (t.note_date IS NOT NULL AND s.read_at < t.note_date)) 
                            THEN 1 ELSE 0 END) AS unseen_count,
                        (CASE WHEN EXISTS (
                           SELECT 1
                           FROM text t2
                           WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId
                        ) THEN 1 ELSE 0 END) AS hasContributed,
                        (CASE WHEN EXISTS (
                           SELECT 1
                           FROM game_has_player ghp
                           WHERE ghp.game_id = g.id AND ghp.player_id = :loggedInWriterId
                        ) THEN 1 ELSE 0 END) AS hasJoined,
                        (CASE WHEN b.text_id IS NOT NULL THEN 1 ELSE 0 END) AS isBookmarked
                  FROM (SELECT @row_num := 0) r,
                        game g
                  INNER JOIN text rt ON g.id = rt.game_id AND rt.parent_id IS NULL
                  INNER JOIN text_status ts ON rt.status_id = ts.id AND 
                        (ts.status = 'published' OR (ts.status = 'draft' AND rt.writer_id = :loggedInWriterId) OR (ts.status = 'incomplete_draft' AND rt.writer_id = :loggedInWriterId)) 
                  INNER JOIN text t ON g.id = t.game_id
                  LEFT JOIN seen s ON t.id = s.text_id AND s.writer_id = :loggedInWriterId
                  LEFT JOIN bookmark b ON rt.id = b.text_id AND b.writer_id = :loggedInWriterId
                  WHERE 1=1 
                  $filterString
                  GROUP BY g.id, g.prompt, rt.id, rt.title";
      
      if ($order) {
         $sql .= " ORDER BY hasContributed DESC, $this->primaryKey $order";
     } else {
         $sql .= " ORDER BY hasContributed DESC";
     }
      
      $stmt = $this->pdo->prepare($sql);
      $stmt->bindValue(':loggedInWriterId', $loggedInWriterId);

      if ($searchTerm) {
         $searchValue = '%' . $searchTerm . '%';
         $stmt->bindValue(':searchTerm', $searchValue);
      }

      if ($id) {
         $stmt->bindValue(':id', $id);
      }

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
      $sql = "SELECT DISTINCT writer_id 
               FROM text 
               WHERE game_id = :game_id";
      $stmt = $this->pdo->prepare($sql);
      $stmt->bindValue(':game_id', $game_id);
      $stmt->execute();
      return $stmt->fetchAll();
  }

   public function getModifiedSince($lastCheck, $filters = [], $searchTerm = null) {
      $filterString = "";
      
      if (isset($filters['hasContributed'])) {
         if ($filters['hasContributed'] === true) {
            $filterString .= " AND EXISTS (
               SELECT 1 FROM text t2 
               WHERE t2.game_id = g.id 
               AND t2.writer_id = :loggedInWriterId
            )";
         } elseif ($filters['hasContributed'] === 'mine') {
            $filterString .= " AND rt.writer_id = :loggedInWriterId";
         }
      }

       // Handle gameState filter
       if (isset($filters['gameState']) && $filters['gameState'] !== 'all') {
         switch($filters['gameState']) {
            case 'open':
               $filterString .= " AND g.open_for_changes = 1 AND ts.status = 'published'";
               break;
            case 'closed':
               $filterString .= " AND g.open_for_changes = 0";
               break;
            case 'pending':
               $filterString .= " AND ts.status IN ('draft', 'incomplete_draft')";
               break;
         }
      }

      // Handle bookmarked filter
      if (isset($filters['bookmarked']) && $filters['bookmarked'] !== null) {
         if ($filters['bookmarked'] === true) {
            $filterString .= " AND b.text_id IS NOT NULL";
         } elseif ($filters['bookmarked'] === false) {
            $filterString .= " AND b.text_id IS NULL";
         }
      }

      // Handle search term
      if ($searchTerm) {
         $filterString .= " AND (
               g.prompt LIKE :searchTerm 
               OR rt.title LIKE :searchTerm 
               OR rt.note LIKE :searchTerm
               OR EXISTS (
                  SELECT 1 
                  FROM text search_text 
                  INNER JOIN text_status search_status ON search_text.status_id = search_status.id
                  INNER JOIN writer w ON search_text.writer_id = w.id
                  LEFT JOIN text_has_keyword thk ON search_text.id = thk.text_id
                  LEFT JOIN keyword k ON thk.keyword_id = k.id
                  WHERE search_text.game_id = g.id 
                  AND (
                     search_status.status = 'published' 
                     OR (search_status.status IN ('draft', 'incomplete_draft') 
                           AND search_text.writer_id = :loggedInWriterId)
                  )
                  AND (
                     search_text.title LIKE :searchTerm 
                     OR search_text.writing LIKE :searchTerm 
                     OR search_text.note LIKE :searchTerm
                     OR CONCAT(w.firstName, ' ', w.lastName) LIKE :searchTerm
                     OR k.word LIKE :searchTerm
                  )
               )
         )";
      }

      $sql = "SELECT g.id AS game_id, 
                     g.prompt,
                     g.modified_at,
                     g.open_for_changes AS openForChanges,
                     rt.id AS id,
                     rt.title AS title,
                     ts.status AS root_text_status,
                     @row_num := @row_num + 1 AS placement_index,
                      SUM(CASE WHEN t.status_id = 2 THEN 1 ELSE 0 END) AS text_count,
                        SUM(CASE 
                            WHEN t.status_id = 2 AND (
                                t.writer_id = :loggedInWriterId OR                    
                                (s.text_id IS NOT NULL AND                           
                                 (t.note_date IS NULL OR s.read_at > t.note_date))   
                            ) THEN 1 ELSE 0 END) AS seen_count,
                        SUM(CASE 
                            WHEN t.status_id = 2 AND 
                                 t.writer_id != :loggedInWriterId AND                
                                 (s.text_id IS NULL OR                               
                                  (t.note_date IS NOT NULL AND s.read_at < t.note_date)) 
                            THEN 1 ELSE 0 END) AS unseen_count,
                     (CASE WHEN EXISTS (
                        SELECT 1
                        FROM text t2
                        WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId
                     ) THEN 1 ELSE 0 END) AS hasContributed,
                     (CASE WHEN EXISTS (
                        SELECT 1
                        FROM game_has_player ghp
                        WHERE ghp.game_id = g.id AND ghp.player_id = :loggedInWriterId
                     ) THEN 1 ELSE 0 END) AS hasJoined,
                     (CASE WHEN b.text_id IS NOT NULL THEN 1 ELSE 0 END) AS isBookmarked
            FROM (SELECT @row_num := 0) r,
            game g
            INNER JOIN text rt ON g.id = rt.game_id AND rt.parent_id IS NULL
            INNER JOIN text_status ts ON rt.status_id = ts.id AND 
                  (ts.status = 'published' OR (ts.status = 'draft' AND rt.writer_id = :loggedInWriterId) OR (ts.status = 'incomplete_draft' AND rt.writer_id = :loggedInWriterId)) 
            INNER JOIN text t ON g.id = t.game_id
            LEFT JOIN seen s ON t.id = s.text_id AND s.writer_id = :loggedInWriterId
            LEFT JOIN bookmark b ON rt.id = b.text_id AND b.writer_id = :loggedInWriterId
            WHERE CAST(g.modified_at AS DATETIME) > CAST(:lastCheck AS DATETIME)
            $filterString
            GROUP BY g.id, g.prompt, rt.id, rt.title";

      //TODO: I changed the lastCheck verification from = to >=... and we need to see if this solves the issue of sometimes receiving a changed game that is 'open for changes' when it should be closed... possibly because the last vote is registering a change within a millisecond from the closing of the game, in another sql query... if they clock at the same time... then this will fix it... if they don't... I may have to combine the queries, so that ending a game executes all of the changes at once, ensuring that polling won't load just half a change... or I need to fingure out another solution. 

      $stmt = $this->pdo->prepare($sql);
      $stmt->bindValue(':lastCheck', $lastCheck);
      if ($searchTerm) {
         $stmt->bindValue(':searchTerm', '%' . $searchTerm . '%');
      }
      $stmt->bindValue(':loggedInWriterId', $_SESSION['writer_id'] ?? 0); 
      
      $stmt->execute();

      $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

      foreach ($results as &$game) {
         $game['hasUnseenTexts'] = ($game['unseen_count'] > 0) ? true : false;
         $game['pending'] = ($game['root_text_status'] == 'draft' || $game['root_text_status'] == 'incomplete_draft') ? true : false;
      }

      return $results;
   }

   public function selectGameId($rootId) {
      $sql = "SELECT game_id FROM text WHERE id = :rootId";
      $stmt = $this->pdo->prepare($sql);
      $stmt->bindValue(':rootId', $rootId);
      $stmt->execute();
      $result = $stmt->fetchColumn();
      return $result;
   }

   public function getRootText($game_id) {
      $sql = "SELECT root_text_id FROM game WHERE id = :game_id";
      $stmt = $this->pdo->prepare($sql);
      $stmt->bindValue(':game_id', $game_id);
      $stmt->execute();
      return $stmt->fetchColumn();
   }
}
