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

   public function getGames($order = null, $filters = [], $id = null, $searchTerm = null, $category = null) {
      $loggedInWriterId = isset($_SESSION['writer_id']) ? $_SESSION['writer_id'] : "";
      
      // Extract tokens from session
      $tokens = [];
      if (isset($_SESSION['game_invitation_access'])) {
         foreach ($_SESSION['game_invitation_access'] as $gameId => $accessInfo) {
            // Check if token is expired
            if (isset($accessInfo['expires_at']) && strtotime($accessInfo['expires_at']) < time()) {
               // Remove expired token
               unset($_SESSION['game_invitation_access'][$gameId]);
               continue;
            }
            $tokens[] = $accessInfo['token'];
         }
      }

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
      
      // Handle category filter - disabled for subquery case
      if ($category && false) {
         if (strpos($category, '.') !== false) {
            // Specific subcategory (e.g., 'myGames.active')
            $filterString .= " AND category = :category";
         } else {
            // Broad category (e.g., 'myGames')
            $filterString .= " AND category LIKE :categoryPattern";
         }
      }

      // Build token condition for the main WHERE clause
      $tokenCondition = "";
      if (!empty($tokens)) {
         $tokenPlaceholders = [];
         foreach ($tokens as $index => $token) {
            $tokenPlaceholders[] = ":token$index";
         }
         $tokenCondition = "EXISTS (SELECT 1 FROM game_invitation gi WHERE gi.game_id = g.id AND gi.token IN (" . implode(', ', $tokenPlaceholders) . ") AND gi.status IN ('pending', 'accepted'))";
      }

      // Build the base query (always the same)
      $baseQuery = "SELECT  g.id AS game_id, 
                        g.prompt,
                        g.open_for_changes AS openForChanges,
                        g.visible_to_all,
                        g.joinable_by_all,
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
                        (CASE WHEN EXISTS (
                           SELECT 1 FROM game_invitation gi 
                           WHERE gi.game_id = g.id 
                           AND gi.invitee_id = :loggedInWriterId 
                           AND gi.status = 'pending'
                        ) THEN 1 ELSE 0 END) AS invited,
                        (CASE WHEN b.text_id IS NOT NULL THEN 1 ELSE 0 END) AS isBookmarked,
                        (CASE 
                            WHEN EXISTS (SELECT 1 FROM text t2 INNER JOIN text_status ts2 ON t2.status_id = ts2.id WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId AND ts2.status IN ('draft', 'incomplete_draft')) THEN 'myGames.drafts'
                            WHEN EXISTS (SELECT 1 FROM text t2 WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId) AND g.open_for_changes = 1 THEN 'myGames.active'
                            WHEN EXISTS (SELECT 1 FROM text t2 WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId) AND g.open_for_changes = 0 THEN 'myGames.archives'
                            WHEN EXISTS (SELECT 1 FROM game_invitation gi WHERE gi.game_id = g.id AND gi.invitee_id = :loggedInWriterId AND gi.status = 'pending') THEN 'canJoin.invitations'
                            WHEN g.open_for_changes = 0 AND g.visible_to_all = 1 AND NOT EXISTS (SELECT 1 FROM text t2 WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId) THEN 'inspiration.closed'
                            ELSE 'canJoin.other'
                        END) AS category
                  FROM (SELECT @row_num := 0) r,
                        game g
                  INNER JOIN text rt ON g.id = rt.game_id AND rt.parent_id IS NULL
                  INNER JOIN text_status ts ON rt.status_id = ts.id AND 
                        (ts.status = 'published' OR (ts.status = 'draft' AND rt.writer_id = :loggedInWriterId) OR (ts.status = 'incomplete_draft' AND rt.writer_id = :loggedInWriterId)) 
                  INNER JOIN text t ON g.id = t.game_id
                  LEFT JOIN seen s ON t.id = s.text_id AND s.writer_id = :loggedInWriterId
                  LEFT JOIN bookmark b ON rt.id = b.text_id AND b.writer_id = :loggedInWriterId
                  WHERE 1=1 
                  AND (
                     g.visible_to_all = 1 
                     OR (
                        g.visible_to_all = 0 AND (
                           -- User is a player in this game
                           (:loggedInWriterId != '' AND EXISTS (SELECT 1 FROM game_has_player ghp2 WHERE ghp2.game_id = g.id AND ghp2.player_id = :loggedInWriterId))
                           OR 
                           -- User has an invitation for this game (by user ID)
                           (:loggedInWriterId != '' AND EXISTS (SELECT 1 FROM game_invitation gi WHERE gi.game_id = g.id AND gi.invitee_id = :loggedInWriterId AND gi.status IN ('pending', 'accepted')))
                           " . (!empty($tokens) ? "OR
                           -- User has a token for this game (by token)
                           $tokenCondition" : "") . "
                        )
                     )
                  )
                  $filterString
                  GROUP BY g.id, g.prompt, rt.id, rt.title";

      // Always wrap in subquery for consistency
      $sql = "SELECT * FROM ($baseQuery) AS subquery";
      
      // Conditionally add category filter
      if ($category) {
         $sql .= " WHERE category = :category";
      }
      
      if ($order) {
         $sql .= " ORDER BY hasContributed DESC, $this->primaryKey $order";
     } else {
         $sql .= " ORDER BY hasContributed DESC";
     }
      
      // Handle broad category pattern matching before preparing statement
      if ($category && strpos($category, '.') === false) {
         // Broad category (e.g., 'myGames') - need to update the WHERE clause
         $sql = str_replace('WHERE category = :category', 'WHERE category LIKE :categoryPattern', $sql);
      }
      
      // Debug: Log the final SQL
      error_log("Game::getGames - Final SQL: " . $sql);
      error_log("Game::getGames - Category: " . ($category ?? 'null'));
      
      $stmt = $this->pdo->prepare($sql);
      $stmt->bindValue(':loggedInWriterId', $loggedInWriterId);

      // Bind token parameters
      foreach ($tokens as $index => $token) {
         $stmt->bindValue(":token$index", $token);
      }

      if ($searchTerm) {
         $searchValue = '%' . $searchTerm . '%';
         $stmt->bindValue(':searchTerm', $searchValue);
      }

      if ($id) {
         $stmt->bindValue(':id', $id);
      }

      // Bind category parameters
      if ($category) {
         if (strpos($category, '.') !== false) {
            // Specific subcategory (e.g., 'myGames.active')
            $stmt->bindValue(':category', $category);
         } else {
            // Broad category (e.g., 'myGames')
            $stmt->bindValue(':categoryPattern', $category . '.%');
         }
      }

      $stmt->execute();
      
      $games = $stmt->fetchAll();
   
      // Add logic to determine if there are any unseen texts
      foreach ($games as &$game) {
            $game['hasUnseenTexts'] = ($game['unseen_count'] > 0) ? true : false;
            $game['pending'] = ($game['root_text_status'] == 'draft' || $game['root_text_status'] == 'incomplete_draft') ? true : false;
            
                     // Check if this game has temporary access via token
         // A game has temporary access if it's accessible via token but NOT via user ID
         $game['hasTemporaryAccess'] = false;
         if (!empty($tokens) && isset($_SESSION['game_invitation_access'][$game['game_id']])) {
             $accessInfo = $_SESSION['game_invitation_access'][$game['game_id']];
             // Check if token is not expired
             if (!isset($accessInfo['expires_at']) || strtotime($accessInfo['expires_at']) >= time()) {
                 $game['hasTemporaryAccess'] = true;
                 $game['temporaryAccessInfo'] = [
                     'invited_email' => $accessInfo['invited_email'],
                     'expires_at' => $accessInfo['expires_at']
                 ];
                 // Add the token for frontend use
                 $game['invitation_token'] = $accessInfo['token'];
             }
         }
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

   public function getModifiedSince($lastCheck, $filters = [], $searchTerm = null, $category = null) {
      $loggedInWriterId = isset($_SESSION['writer_id']) ? $_SESSION['writer_id'] : "";
      
      // Extract tokens from session
      $tokens = [];
      if (isset($_SESSION['game_invitation_access'])) {
         foreach ($_SESSION['game_invitation_access'] as $gameId => $accessInfo) {
            // Check if token is expired
            if (isset($accessInfo['expires_at']) && strtotime($accessInfo['expires_at']) < time()) {
               // Remove expired token
               unset($_SESSION['game_invitation_access'][$gameId]);
               continue;
            }
            $tokens[] = $accessInfo['token'];
         }
      }

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
      
      // Handle category filter - disabled for subquery case
      if ($category && false) {
         if (strpos($category, '.') !== false) {
            // Specific subcategory (e.g., 'myGames.active')
            $filterString .= " AND category = :category";
         } else {
            // Broad category (e.g., 'myGames')
            $filterString .= " AND category LIKE :categoryPattern";
         }
      }

      // Build token condition for the main WHERE clause
      $tokenCondition = "";
      if (!empty($tokens)) {
         $tokenPlaceholders = [];
         foreach ($tokens as $index => $token) {
            $tokenPlaceholders[] = ":token$index";
         }
         $tokenCondition = "EXISTS (SELECT 1 FROM game_invitation gi WHERE gi.game_id = g.id AND gi.token IN (" . implode(', ', $tokenPlaceholders) . ") AND gi.status IN ('pending', 'accepted'))";
      }

      // Build the base query (always the same)
      $baseQuery = "SELECT g.id AS game_id, 
                     g.prompt,
                     g.modified_at,
                     g.open_for_changes AS openForChanges,
                     g.visible_to_all,
                     g.joinable_by_all,
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
                     (CASE WHEN EXISTS (
                        SELECT 1 FROM game_invitation gi 
                        WHERE gi.game_id = g.id 
                        AND gi.invitee_id = :loggedInWriterId 
                        AND gi.status = 'pending'
                     ) THEN 1 ELSE 0 END) AS invited,
                     (CASE WHEN b.text_id IS NOT NULL THEN 1 ELSE 0 END) AS isBookmarked,
                     (CASE 
                        WHEN EXISTS (SELECT 1 FROM text t2 INNER JOIN text_status ts2 ON t2.status_id = ts2.id WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId AND ts2.status IN ('draft', 'incomplete_draft')) THEN 'myGames.drafts'
                        WHEN EXISTS (SELECT 1 FROM text t2 WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId) AND g.open_for_changes = 1 THEN 'myGames.active'
                        WHEN EXISTS (SELECT 1 FROM text t2 WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId) AND g.open_for_changes = 0 THEN 'myGames.archives'
                        WHEN EXISTS (SELECT 1 FROM game_invitation gi WHERE gi.game_id = g.id AND gi.invitee_id = :loggedInWriterId AND gi.status = 'pending') THEN 'canJoin.invitations'
                        WHEN g.open_for_changes = 0 AND g.visible_to_all = 1 AND NOT EXISTS (SELECT 1 FROM text t2 WHERE t2.game_id = g.id AND t2.writer_id = :loggedInWriterId) THEN 'inspiration.closed'
                        ELSE 'canJoin.other'
                     END) AS category
            FROM (SELECT @row_num := 0) r,
            game g
            INNER JOIN text rt ON g.id = rt.game_id AND rt.parent_id IS NULL
            INNER JOIN text_status ts ON rt.status_id = ts.id AND 
                  (ts.status = 'published' OR (ts.status = 'draft' AND rt.writer_id = :loggedInWriterId) OR (ts.status = 'incomplete_draft' AND rt.writer_id = :loggedInWriterId)) 
            INNER JOIN text t ON g.id = t.game_id
            LEFT JOIN seen s ON t.id = s.text_id AND s.writer_id = :loggedInWriterId
            LEFT JOIN bookmark b ON rt.id = b.text_id AND b.writer_id = :loggedInWriterId
            WHERE CAST(g.modified_at AS DATETIME) > CAST(:lastCheck AS DATETIME)
            AND (
               g.visible_to_all = 1 
               OR (
                  g.visible_to_all = 0 AND (
                     -- User is a player in this game
                     (:loggedInWriterId != '' AND EXISTS (SELECT 1 FROM game_has_player ghp2 WHERE ghp2.game_id = g.id AND ghp2.player_id = :loggedInWriterId))
                     OR 
                     -- User has an invitation for this game (by user ID)
                     (:loggedInWriterId != '' AND EXISTS (SELECT 1 FROM game_invitation gi WHERE gi.game_id = g.id AND gi.invitee_id = :loggedInWriterId AND gi.status IN ('pending', 'accepted')))
                     " . (!empty($tokens) ? "OR
                     -- User has a token for this game (by token)
                     $tokenCondition" : "") . "
                  )
               )
            )
            $filterString
            GROUP BY g.id, g.prompt, rt.id, rt.title";

      // Always wrap in subquery for consistency
      $sql = "SELECT * FROM ($baseQuery) AS subquery";
      
      // Conditionally add category filter
      if ($category) {
         $sql .= " WHERE category = :category";
      }

      // Handle broad category pattern matching before preparing statement
      if ($category && strpos($category, '.') === false) {
         // Broad category (e.g., 'myGames') - need to update the WHERE clause
         $sql = str_replace('WHERE category = :category', 'WHERE category LIKE :categoryPattern', $sql);
      }

      //TODO: I changed the lastCheck verification from = to >=... and we need to see if this solves the issue of sometimes receiving a changed game that is 'open for changes' when it should be closed... possibly because the last vote is registering a change within a millisecond from the closing of the game, in another sql query... if they clock at the same time... then this will fix it... if they don't... I may have to combine the queries, so that ending a game executes all of the changes at once, ensuring that polling won't load just half a change... or I need to fingure out another solution. 

      $stmt = $this->pdo->prepare($sql);
      $stmt->bindValue(':lastCheck', $lastCheck);
      if ($searchTerm) {
         $stmt->bindValue(':searchTerm', '%' . $searchTerm . '%');
      }
      $stmt->bindValue(':loggedInWriterId', $loggedInWriterId);
      
      // Bind token parameters
      foreach ($tokens as $index => $token) {
         $stmt->bindValue(":token$index", $token);
      }
      
      // Bind category parameters
      if ($category) {
         if (strpos($category, '.') !== false) {
            // Specific subcategory (e.g., 'myGames.active')
            $stmt->bindValue(':category', $category);
         } else {
            // Broad category (e.g., 'myGames')
            $stmt->bindValue(':categoryPattern', $category . '.%');
         }
      }

      $stmt->execute();

      $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

      foreach ($results as &$game) {
         $game['hasUnseenTexts'] = ($game['unseen_count'] > 0) ? true : false;
         $game['pending'] = ($game['root_text_status'] == 'draft' || $game['root_text_status'] == 'incomplete_draft') ? true : false;
         
         // Check if this game has temporary access via token
         // A game has temporary access if it's accessible via token but NOT via user ID
         $game['hasTemporaryAccess'] = false;
         if (!empty($tokens) && isset($_SESSION['game_invitation_access'][$game['game_id']])) {
             $accessInfo = $_SESSION['game_invitation_access'][$game['game_id']];
             // Check if token is not expired
             if (!isset($accessInfo['expires_at']) || strtotime($accessInfo['expires_at']) >= time()) {
                 $game['hasTemporaryAccess'] = true;
                 $game['temporaryAccessInfo'] = [
                     'invited_email' => $accessInfo['invited_email'],
                     'expires_at' => $accessInfo['expires_at']
                 ];
                 // Add the token for frontend use
                 $game['invitation_token'] = $accessInfo['token'];
             }
         }
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
