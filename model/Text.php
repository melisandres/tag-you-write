<?php
require_once('Crud.php');

class Text extends Crud{

    public $table = 'text';
    public $primaryKey = 'id';
    public $fillable = ['id',
                        'prompt',
                        'date',
                        'writing',
                        'writer_id',
                        'parent_id',
                        'title',
                        'note',
                        'note_date', 
                        'game_id',
                        'status_id'
                        ];

    // This is used to get ONE, MANY, or ALL texts. the ID_VALUE can be the TEXT_ID, if you only want one text (3rd param false), or the GAME_ID (3rd param true), if you want one arborescence of texts, FINALLY, if you want only an array of texts, that have been modified since a timestamp, add it as MODIFIED_SINCE parameter.The arborescence is built in the controllerText, the permissions are added there as well. 
    public function selectTexts($current_writer = null, $idValue = null, $idIsGameId = false, $modifiedSince = null) {
        // Base SQL part
        $sql = "SELECT text.*, 
                        writer.firstName AS firstName, 
                        writer.lastName AS lastName,
                        game.prompt AS prompt,
                        game.open_for_changes AS openForChanges,
                        text_status.status AS text_status,
                        text.modified_at AS modified_at,
                        root_text.title AS game_title,
                        IFNULL(voteCounts.voteCount, 0) AS voteCount,
                        IFNULL(playerCounts.playerCount, 0) AS playerCount,
                        CASE WHEN game.winner = text.id THEN TRUE ELSE FALSE END AS isWinner";
        
        // Check if current_writer is provided or not
        if ($current_writer) {
            // When a writer is logged in
            $sql .= ", CASE 
                            WHEN vote.writer_id = :currentUserId THEN 1 
                            ELSE 0 
                        END AS hasVoted,
                        CASE 
                            WHEN text.writer_id = :currentUserId THEN 1
                            WHEN seen.text_id IS NULL THEN 0
                            WHEN text.note_date IS NULL THEN 1
                            WHEN seen.read_at > text.note_date THEN 1
                            ELSE 0
                        END AS text_seen,
                        CASE 
                            WHEN game_has_player.player_id IS NOT NULL THEN 1 
                            ELSE 0 
                        END AS hasContributed";
        } else {
            // When no writer is logged in
            $sql .= ", 0 AS hasContributed";
        }
    
        $sql .= " FROM text
                    INNER JOIN writer ON text.writer_id = writer.id
                    INNER JOIN text_status ON text.status_id = text_status.id
                    LEFT JOIN game ON text.game_id = game.id
                    LEFT JOIN text AS root_text ON game.root_text_id = root_text.id
                    LEFT JOIN (
                        SELECT text_id, COUNT(*) AS voteCount
                        FROM vote
                        GROUP BY text_id
                    ) AS voteCounts ON text.id = voteCounts.text_id
                    LEFT JOIN (
                        SELECT game_id, COUNT(*) AS playerCount
                        FROM game_has_player
                        GROUP BY game_id
                    ) AS playerCounts ON text.game_id = playerCounts.game_id";
        
        if ($current_writer) {
            $sql .= "   LEFT JOIN game_has_player ON text.game_id = game_has_player.game_id AND game_has_player.player_id = :currentUserId
                        LEFT JOIN vote ON text.id = vote.text_id AND vote.writer_id = :currentUserId
                        LEFT JOIN seen ON text.id = seen.text_id AND seen.writer_id = :currentUserId";
        } else {
            $sql .= " LEFT JOIN vote ON text.id = vote.text_id";
        }
        
        // Initialize an array to collect conditions
        $conditions = [];

        // Add condition for modified since
        if ($modifiedSince !== null) {
            error_log("Comparing against modified_since (Unix timestamp): " . $modifiedSince);
            $conditions[] = "text.modified_at > :modifiedSince";
        }
        
        // Add condition for filtering out the drafts, only if they don't belong to the currentUser
        if ($current_writer) {
            $conditions[] = "(text_status.status != 'draft' AND text_status.status != 'incomplete_draft' OR text.writer_id = :currentUserId)";
        } else {
            $conditions[] = "text_status.status != 'draft' AND text_status.status != 'incomplete_draft'";
        }
        
        // Add condition if idValue is provided
        if ($idValue !== null && !$idIsGameId) {
            $conditions[] = "text.id = :idValue";
        }
        if ($idValue !== null && $idIsGameId) {
            $conditions[] = "text.game_id = :idValue";
        }
        
        // Combine all conditions and append to SQL
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        // Group it by text.id
        $sql .= " GROUP BY text.id";
        
        // Log the SQL query and parameters
        //error_log("Executing selectTexts with SQL: " . $sql);

        $stmt = $this->prepare($sql);
        
        // Bind the current writer ID if it's provided
        if ($current_writer) {
            $stmt->bindValue(':currentUserId', $current_writer);
        }
        
        // Bind the idValue if it's provided
        if ($idValue !== null) {
            $stmt->bindValue(':idValue', $idValue);
        }

        // Bind the modifiedSince if it's provided
        if ($modifiedSince !== null) {
            $stmt->bindValue(':modifiedSince', $modifiedSince);
            /* error_log("SQL with bound values: " . str_replace(':modifiedSince', $modifiedSince, $sql)); */
        }
        
        $stmt->execute();
        
        $results = ($idValue !== null && !$idIsGameId) ? $stmt->fetch() : $stmt->fetchAll();
        
        return $results;
    }

    //returns the text as well as the first and last name of the writer
    //by id I'm not using the variables I'm passing--this is a little confusing 
    //it might make sense to also get the keywords here.
    public function selectIdText($idValue, $url='writer'){
        $table = $this->table;
        $primaryKey = $this->primaryKey;
        $sql = "SELECT text.*, 
                writer.firstName AS firstName, 
                writer.lastName AS lastName, 
                game.prompt AS prompt
                FROM $table 
                INNER JOIN writer 
                ON text.writer_id = writer.id 
                INNER JOIN game
                ON text.game_id = game.id
                WHERE $table.$primaryKey = :$primaryKey;";
        
        $stmt = $this->prepare($sql);
        $stmt->bindValue(":$primaryKey", $idValue);
        $stmt->execute();

        $count = $stmt->rowCount();
        if ($count == 1){
            return $stmt->fetch();
        }else{
            return false;
        }
    }

    public function selectGameId($id) {
        $table = $this->table;
        $primaryKey = $this->primaryKey;
        $sql =  "SELECT game_id 
                FROM $table 
                WHERE $table.$primaryKey = :$primaryKey;";
        $stmt = $this->prepare($sql);

        $stmt->bindValue(":$primaryKey", $id);
        $stmt->execute();

        $count = $stmt->rowCount();
        if ($count == 1){
            return $stmt->fetchColumn();
        }else{
            return false;
        }

    }

    public function searchNodesByTerm($term, $gameId, $currentWriterId = null, $lastTreeCheck = null) {
        try {
            $term = trim($term, '"');

            $sql = "SELECT text.id,
                    CASE WHEN writing LIKE :term THEN 1 ELSE 0 END AS writingMatches,
                    CASE WHEN note LIKE :term THEN 1 ELSE 0 END AS noteMatches,
                    CASE WHEN title LIKE :term THEN 1 ELSE 0 END AS titleMatches,
                    CASE WHEN CONCAT(writer.firstName, ' ', writer.lastName) LIKE :term THEN 1 ELSE 0 END AS writerMatches,
                    CASE WHEN keyword.word LIKE :term THEN 1 ELSE 0 END AS keywordMatches
                    FROM text 
                    INNER JOIN writer ON text.writer_id = writer.id
                    INNER JOIN text_status ON text.status_id = text_status.id
                    LEFT JOIN text_has_keyword ON text.id = text_has_keyword.text_id
                    LEFT JOIN keyword ON text_has_keyword.keyword_id = keyword.id
                    WHERE game_id = :gameId 
                    AND (text_status.status = 'published' 
                        OR (text_status.status IN ('draft', 'incomplete_draft') 
                            AND writer_id = :currentWriterId))";

            if ($lastTreeCheck !== null) {
                $sql .= " AND text.modified_at > :lastTreeCheck";
            }

            $stmt = $this->prepare($sql);
            $stmt->bindValue(':term', '%' . $term . '%', PDO::PARAM_STR);
            $stmt->bindValue(':gameId', (int)$gameId, PDO::PARAM_INT);
            $stmt->bindValue(':currentWriterId', (int)$currentWriterId, PDO::PARAM_INT);

            if ($lastTreeCheck !== null) {
                $stmt->bindValue(':lastTreeCheck', $lastTreeCheck, PDO::PARAM_STR);
            }

            // Log the SQL query with bound values for debugging
            $boundSql = str_replace(
                [':term', ':gameId', ':currentWriterId'],
                ["'%" . $term . "%'", (int)$gameId, (int)$currentWriterId],
                $sql
            );
            error_log("Executing SQL: " . $boundSql);

            $stmt->execute();

            // Check for SQL errors
            $errorInfo = $stmt->errorInfo();
            if ($errorInfo[0] !== '00000') {
                error_log("SQL Error: " . print_r($errorInfo, true));
            }

            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log('PDOException in searchNodesByTerm: ' . $e->getMessage());
            return [];
        }
    }
}


/* 
public function selectTextsRecursive(){
    $sql = "CALL GetTextsRecursive();";

    $stmt = $this->query($sql);
    $stmt->execute();

    return $stmt->fetchAll();
} */

/**
 * the following is the code that must be added to the db, so that the recursive function can run
 */




/*

DELIMITER $$

CREATE PROCEDURE GetTextsRecursive()
BEGIN
    -- Drop temporary table if it exists
    DROP TEMPORARY TABLE IF EXISTS temp_text_hierarchy;

    -- Create a temporary table with the same structure as the original table
    CREATE TEMPORARY TABLE temp_text_hierarchy LIKE text;

    -- Add additional columns for hierarchy tracking
    ALTER TABLE temp_text_hierarchy ADD COLUMN path VARCHAR(255), ADD COLUMN firstName VARCHAR(255), ADD COLUMN lastName VARCHAR(255);

    -- Insert root nodes into the temporary table
    INSERT INTO temp_text_hierarchy
    SELECT 
        text.*, 
        text.title AS path,
        writer.firstName, 
        writer.lastName
    FROM text
    INNER JOIN writer 
    ON text.writer_id = writer.id
    WHERE text.parent_id IS NULL;

    -- Loop to insert child nodes
    REPEAT
        INSERT INTO temp_text_hierarchy
        SELECT 
            t.*, 
            CONCAT(th.path, ' > ', t.title) AS path,
            w.firstName, 
            w.lastName
        FROM text t
        INNER JOIN writer w
        ON t.writer_id = w.id
        JOIN temp_text_hierarchy th
        ON t.parent_id = th.id
        WHERE t.id NOT IN (SELECT id FROM temp_text_hierarchy);

        UNTIL ROW_COUNT() = 0
    END REPEAT;

    -- Select the hierarchical data
    SELECT * FROM temp_text_hierarchy;
END $$

DELIMITER ; */

?>

