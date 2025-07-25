<?php

require_once('DatabaseConnection.php');

abstract class Crud {
    protected $pdo;
    protected $table;
    protected $primaryKey;

    public function __construct() {
        // Get a connection from the pool instead of creating a new one
        $this->pdo = DatabaseConnection::getConnection();
    }

    public function __destruct() {
        // Release the connection back to the pool when done
        if ($this->pdo) {
            DatabaseConnection::releaseConnection($this->pdo);
            $this->pdo = null;
        }
    }
    
    //this is only being called by writer, at the moment, but it's so general I hesitate to put it in the writer model
    public function select($order = null) {
        $sql = "SELECT * 
                FROM $this->table 
                ORDER BY $this->primaryKey $order";
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll();
    }

    public function selectId($value, $id = null) {
        if($id == null) $id = $this->primaryKey;

        $sql = "SELECT * 
                FROM $this->table 
                WHERE $id = :$id";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(":$id", $value);
        $stmt->execute();

        $count = $stmt->rowCount();
        if($count == 1) {
            return $stmt->fetch();
        } else {
            return false;
        }   
    }

    public function selectAllById($id, $nameOfId = 'text_id') {
        $sql = "SELECT * 
                FROM $this->table 
                WHERE text_id = :text_id";
    
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(":text_id", $nameOfId);
        $stmt->execute();
    
        return $stmt->fetchAll(); // Return all matching entries
    }

    public function deleteById($id, $nameOfId = 'text_id') {
        $sql = "DELETE FROM $this->table WHERE $nameOfId = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(":id", $id);
        
        if ($stmt->execute()) {
            return true;
        } else {
            $errorInfo = $stmt->errorInfo();
            error_log("SQL Error: " . print_r($errorInfo, true));
            return false;
        }
    }

    public function selectStatus($status) {
        $sql = "SELECT $this->table.id 
                FROM $this->table 
                WHERE status = :status";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':status', $status);
        $stmt->execute();
    
        return $stmt->fetchColumn();
    }

    public function insert($data, $keyWordInsert = false) {
        $fieldName = implode(', ', array_keys($data));
        $fieldValue = ":".implode(', :', array_keys($data));
        $keywordExtra = null;
        
        if ($keyWordInsert) {
            $keywordExtra = "ON DUPLICATE KEY UPDATE word = VALUES(word)";
        }

        $sql = "INSERT INTO $this->table ($fieldName) VALUES ($fieldValue) $keywordExtra";

        $stmt = $this->pdo->prepare($sql);

        foreach ($data as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        if ($stmt->execute()) {
            $lastInsertId = $this->pdo->lastInsertId();
            error_log("Insert successful, last insert ID: " . $lastInsertId);
            return $lastInsertId;
        } else {
            $errorInfo = $stmt->errorInfo();
            error_log("Insert failed: " . print_r($errorInfo, true));
            return $errorInfo;
        }
    }

    public function update($data) {
        $fieldName = null;

        foreach ($data as $key => $value) {
            $fieldName .= "$key = :$key, "; 
        }

        $fieldName = rtrim($fieldName, ", ");

        $sql = "UPDATE $this->table SET $fieldName WHERE $this->primaryKey = :$this->primaryKey;";

        $stmt = $this->pdo->prepare($sql);
        foreach ($data as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        try {
            $result = $stmt->execute();
            return $result;
        } catch (PDOException $e) {
            // Log the error
            error_log("Database update error: " . $e->getMessage());
            return false;
        }
    }

    //returns an array where the keys are keyword.id and the values are keyword.word. These values are only the ones associated to the text.id sent to the function
    public function selectKeyword($idValue) {
        $sql = "SELECT word, id 
                FROM keyword 
                INNER JOIN text_has_keyword 
                ON keyword_id = keyword.id 
                WHERE text_id = :$this->primaryKey";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(":$this->primaryKey", $idValue);
        $stmt->execute();

        $result = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $result[$row['id']] = $row['word'];
        }

        return $result;
    }

    public function delete($value) {
        try {
            $sql = "DELETE FROM $this->table WHERE $this->primaryKey = :$this->primaryKey;";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(":$this->primaryKey", $value);
    
            if ($stmt->execute()) {
                return true;
            } else {
                // Capture and log error information
                $errorInfo = $stmt->errorInfo();
                error_log("SQL Error: " . print_r($errorInfo, true)); // Log the error details
                return $errorInfo; // Return error details to the controller
            }
        } catch (PDOException $e) {
            error_log("PDOException: " . $e->getMessage()); // Log the exception message
            return ["error" => $e->getMessage()]; // Return exception message as error
        }
    }


    // Select a row based on composite primary key
    public function selectCompositeId($values) {
        // Ensure the values contain all primary key fields
        foreach ($this->primaryKey as $key) {
            if (!isset($values[$key])) {
                throw new Exception("Missing value for primary key $key.");
            }
        }

        // Build the WHERE clause with the composite key
        $whereClause = [];
        foreach ($this->primaryKey as $key) {
            $whereClause[] = "$key = :$key";
        }
        $whereClause = implode(" AND ", $whereClause);

        $sql = "SELECT * FROM $this->table WHERE $whereClause";

        $stmt = $this->pdo->prepare($sql);

        // Bind values
        foreach ($values as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }
        $stmt->execute();

        $count = $stmt->rowCount();
        if ($count == 1) {
            return $stmt->fetch();
        } else {
            return false;
        }
    }

    // Save a row with composite primary key
    public function saveComposite($values) {
        // Ensure values contain all primary key fields
        foreach ($this->primaryKey as $key) {
            if (!isset($values[$key])) {
                throw new Exception("Missing value for primary key $key.");
            }
        }

        $columns = implode(", ", array_keys($values));
        $placeholders = implode(", ", array_map(function($key) { return ":$key"; }, array_keys($values)));
        $updateClause = implode(", ", array_map(function($key) { return "$key = VALUES($key)"; }, array_keys($values)));

        $sql = "INSERT INTO $this->table ($columns) VALUES ($placeholders)
                ON DUPLICATE KEY UPDATE $updateClause";

        $stmt = $this->pdo->prepare($sql);

        // Bind values
        foreach ($values as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        if ($stmt->execute()) {
            return true;
        } else {
            $errorInfo = $stmt->errorInfo();
            error_log("SQL Error: " . print_r($errorInfo, true));
            return false;
        }
    }

    // Delete a row with composite primary key
    public function deleteComposite($values) {
        // Ensure values contain all primary key fields
        foreach ($this->primaryKey as $key) {
            if (!isset($values[$key])) {
                throw new Exception("Missing value for primary key $key.");
            }
        }

        // Build the WHERE clause with the composite key
        $whereClause = [];
        foreach ($this->primaryKey as $key) {
            $whereClause[] = "$key = :$key";
        }
        $whereClause = implode(" AND ", $whereClause);

        $sql = "DELETE FROM $this->table WHERE $whereClause";

        $stmt = $this->pdo->prepare($sql);

        // Bind values
        foreach ($values as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        if ($stmt->execute()) {
            return true;
        } else {
            $errorInfo = $stmt->errorInfo();
            error_log("SQL Error: " . print_r($errorInfo, true));
            return false;
        }
    }

    public function updateCompositeID($values) {
        // Ensure values contain all primary key fields
        foreach ($this->primaryKey as $key) {
            if (!isset($values[$key])) {
                throw new Exception("Missing value for primary key $key.");
            }
        }
    
        // Build the WHERE clause with the composite key
        $whereClause = [];
        foreach ($this->primaryKey as $key) {
            $whereClause[] = "$key = :$key";
        }
        $whereClause = implode(" AND ", $whereClause);
    
        // Build the SET clause for updating columns
        $setClause = [];
        foreach ($values as $key => $value) {
            if (!in_array($key, $this->primaryKey)) {
                $setClause[] = "$key = :$key";
            }
        }
        $setClause = implode(", ", $setClause);
    
        $sql = "UPDATE $this->table SET $setClause WHERE $whereClause";
    
        $stmt = $this->pdo->prepare($sql);
    
        // Bind values
        foreach ($values as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }
    
        return $stmt->execute();
    }

}

?>