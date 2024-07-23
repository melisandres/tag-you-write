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
                        'game_id'
                        ];

    public function selectTexts($current_writer = null) {
        // Base SQL part
        $sql = "SELECT text.*, 
                       writer.firstName AS firstName, 
                       writer.lastName AS lastName,
                       game.prompt AS prompt,
                       IFNULL(voteCounts.voteCount, 0) AS voteCount,
                       IFNULL(playerCounts.playerCount, 0) AS playerCount";
                           
        // Check if current_writer is provided or not
        if ($current_writer) {
            // When a writer is logged in
            $sql .= ", CASE WHEN vote.writer_id IS NOT NULL THEN 1 ELSE 0 END AS hasVoted
                      FROM text
                      INNER JOIN writer ON text.writer_id = writer.id
                      LEFT JOIN game ON text.game_id = game.id
                      LEFT JOIN (
                          SELECT text_id, COUNT(*) AS voteCount
                          FROM vote
                          GROUP BY text_id
                      ) AS voteCounts ON text.id = voteCounts.text_id
                      LEFT JOIN (
                          SELECT game_id, COUNT(*) AS playerCount
                          FROM game_has_player
                          GROUP BY game_id
                      ) AS playerCounts ON text.game_id = playerCounts.game_id
                      LEFT JOIN vote ON text.id = vote.text_id AND vote.writer_id = :currentUserId
                      GROUP BY text.id";
        } else {
            // When no writer is logged in
            $sql .= " FROM text
                      INNER JOIN writer ON text.writer_id = writer.id
                      LEFT JOIN game ON text.game_id = game.id
                      LEFT JOIN (
                          SELECT text_id, COUNT(*) AS voteCount
                          FROM vote
                          GROUP BY text_id
                      ) AS voteCounts ON text.id = voteCounts.text_id
                      LEFT JOIN (
                          SELECT game_id, COUNT(*) AS playerCount
                          FROM game_has_player
                          GROUP BY game_id
                      ) AS playerCounts ON text.game_id = playerCounts.game_id
                      LEFT JOIN vote ON text.id = vote.text_id
                      GROUP BY text.id";
        }
        
        $stmt = $this->prepare($sql);
        
        // Bind the current writer ID only if it's provided
        if ($current_writer) {
            $stmt->bindValue(':currentUserId', $current_writer);
        }
        
        $stmt->execute();
        return $stmt->fetchAll();
    }
    
    
    
    
    
/*     public function selectTexts(){
        $sql = "SELECT text.*, 
                writer.firstName AS firstName, 
                writer.lastName AS lastName
                FROM text
                INNER JOIN writer 
                ON text.writer_id = writer.id;";

        $stmt = $this->query($sql);
        $stmt->execute();

        return $stmt->fetchAll();
    } */


    //returns the text as well as the first and last name of the writer
    //by id I'm not using the variables I'm passing--this is a little confusing 
    //it might make sense to also get the keywords here.
    public function selectIdText($idValue, $url='writer'){
        $table = $this->table;
        $primaryKey = $this->primaryKey;
        $sql = "SELECT text.*, 
                writer.firstName AS firstName, 
                writer.lastName AS lastName 
                FROM $table INNER JOIN writer 
                ON text.writer_id = writer.id 
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

