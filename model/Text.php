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
                        'note_date'
                        ];

    //returns all the  texts along with the name of the writer of the text
    //in the display all texts page
    public function selectTexts(){
        $sql = "SELECT text.*, 
                writer.firstName AS firstName, 
                writer.lastName AS lastName
                FROM text
                INNER JOIN writer 
                ON text.writer_id = writer.id;";

        $stmt = $this->query($sql);
        $stmt->execute();

        return $stmt->fetchAll();
    }


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

