<?php
// Setup script for the activity tracking system
require_once('config/load_env.php');

try {
    // Database connection parameters
    $host = getenv('DB_HOST') ?: 'localhost';
    $port = getenv('DB_PORT') ?: '8889';
    $user = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASSWORD') ?: '';
    $dbname = getenv('DB_NAME') ?: 'tag';
    
    echo "🔧 Setting up activity tracking system...\n";
    echo "Host: $host, Port: $port, Database: $dbname\n\n";
    
    // Step 1: Connect to MySQL server (without database)
    $dsn = "mysql:host={$host};port={$port};charset=utf8";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Connected to MySQL server\n";
    
    // Step 2: Create database if it doesn't exist
    $stmt = $pdo->query("SHOW DATABASES LIKE '$dbname'");
    if ($stmt->rowCount() === 0) {
        echo "📦 Creating database '$dbname'...\n";
        $pdo->exec("CREATE DATABASE $dbname CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "✅ Database '$dbname' created\n";
    } else {
        echo "✅ Database '$dbname' already exists\n";
    }
    
    // Step 3: Connect to the specific database
    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Connected to database '$dbname'\n";
    
    // Step 4: Create writer_activity table
    echo "📋 Creating writer_activity table...\n";
    
    $createTableSQL = "
    DROP TABLE IF EXISTS writer_activity;
    CREATE TABLE writer_activity (
        id INT PRIMARY KEY AUTO_INCREMENT,
        writer_id INT NOT NULL,
        activity_type ENUM('browsing', 'editing', 'starting_game') NOT NULL,
        activity_level ENUM('active', 'idle') NOT NULL,
        page_type ENUM('game_list', 'text_form', 'collab_page', 'home', 'other') NOT NULL,
        game_id INT NULL,
        text_id INT NULL,
        parent_id INT NULL,
        session_id VARCHAR(255) NULL, -- For anonymous users
        last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- UNIQUE constraint to ensure one entry per writer
        UNIQUE KEY unique_writer (writer_id),
        
        -- Performance indexes
        INDEX idx_game_activity (game_id),
        INDEX idx_text_activity (text_id),
        INDEX idx_heartbeat (last_heartbeat)
        
        -- Note: Foreign key constraints commented out for testing
        -- Uncomment these if you have the referenced tables:
        -- FOREIGN KEY (writer_id) REFERENCES writer(id) ON DELETE CASCADE,
        -- FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE,
        -- FOREIGN KEY (text_id) REFERENCES text(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($createTableSQL);
    echo "✅ writer_activity table created with UNIQUE constraint on writer_id\n";
    
    // Step 5: Verify table structure
    echo "📋 Verifying table structure...\n";
    $stmt = $pdo->query("DESCRIBE writer_activity");
    $columns = $stmt->fetchAll();
    
    foreach ($columns as $column) {
        echo "  - {$column['Field']}: {$column['Type']} {$column['Key']}\n";
    }
    
    // Step 6: Test the WriterActivity model
    echo "\n🧪 Testing WriterActivity model...\n";
    require_once('model/WriterActivity.php');
    $writerActivity = new WriterActivity();
    echo "✅ WriterActivity model loaded successfully\n";
    
    echo "\n🎉 Activity tracking system setup complete!\n";
    echo "💡 You can now test the system with test-activity.html\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "💡 Make sure MAMP is running and check your .env configuration\n";
}
?> 