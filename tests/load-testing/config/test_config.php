<?php
/**
 * Load Testing Configuration
 * 
 * Centralized configuration for all load testing scripts.
 * Update these settings to match your environment.
 */

return [
    // Server Configuration
    'server' => [
        'base_url' => 'http://localhost:8888/tag-you-write-repo/tag-you-write/',
        'port' => 8888,
        'timeout' => 30,
        'connect_timeout' => 10,
    ],
    
    // Database Configuration (for realistic tests)
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'tag_you_write',
        'username' => 'root',
        'password' => 'root',
        'max_connections' => 10,
    ],
    
    // Test Parameters
    'load_levels' => [
        'light' => 10,      // 10 concurrent users
        'medium' => 25,     // 25 concurrent users
        'heavy' => 50,      // 50 concurrent users
        'stress' => 100,    // 100 concurrent users
    ],
    
    // SSE Configuration
    'sse' => [
        'endpoint' => '/public/sse/events.php',
        'timeout' => 60,
        'max_connections' => 50,
    ],
    
    // Game-Specific Test Settings
    'game' => [
        'test_users' => 15,
        'session_duration' => 300, // 5 minutes
        'realistic_actions' => [
            'login' => true,
            'game_list' => true,
            'text_interaction' => true,
            'realtime_activity' => true,
        ],
    ],
    
    // Apache Bench Settings
    'apache_bench' => [
        'requests_per_test' => 1000,
        'concurrent_users' => [10, 25, 50, 100],
        'timeout' => 30,
    ],
    
    // Output Configuration
    'output' => [
        'results_dir' => __DIR__ . '/../results/',
        'log_level' => 'INFO', // DEBUG, INFO, WARNING, ERROR
        'save_results' => true,
        'timestamp_format' => 'Y-m-d_H-i-s',
    ],
    
    // Performance Thresholds
    'thresholds' => [
        'max_response_time' => 1000,    // 1 second
        'min_success_rate' => 95,       // 95%
        'max_connection_time' => 500,   // 500ms
        'max_memory_usage' => 256,      // 256MB
    ],
    
    // Environment Detection
    'environment' => [
        'is_development' => true,
        'is_staging' => false,
        'is_production' => false,
    ],
    
    // Debug Settings
    'debug' => [
        'verbose_output' => false,
        'save_debug_logs' => true,
        'log_file' => __DIR__ . '/../results/debug.log',
    ],
]; 