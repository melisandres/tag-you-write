<?php
/**
 * Redis Toggle Script (Development Only)
 * 
 * This script allows toggling Redis on/off for testing purposes.
 * Only works in development environments.
 * Visit /sse/toggle_redis.php?enable=true to enable Redis.
 * Visit /sse/toggle_redis.php?enable=false to disable Redis.
 */

// Define environments where this toggle can work
$devEnvironments = ['development', 'local', 'test'];

// Get current environment
$currentEnv = getenv('APP_ENV') ?: 'production';

// Allow toggle only in development environments
if (!in_array($currentEnv, $devEnvironments)) {
    header('HTTP/1.1 403 Forbidden');
    echo json_encode([
        'error' => 'This toggle is only available in development environments',
        'current_env' => $currentEnv
    ]);
    exit;
}

// Load RedisManager
require_once('../../services/RedisManager.php');

// Check if the toggle parameter is provided
if (isset($_GET['enable'])) {
    $enable = filter_var($_GET['enable'], FILTER_VALIDATE_BOOLEAN);
    
    // Update the static property
    RedisManager::$USE_REDIS = $enable;
    
    // Store the setting in a session variable to maintain it across requests
    session_start();
    $_SESSION['redis_enabled'] = $enable;
    
    // Respond with the current state
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'redis_enabled' => RedisManager::$USE_REDIS,
        'message' => 'Redis is now ' . (RedisManager::$USE_REDIS ? 'enabled' : 'disabled')
    ]);
} else {
    // Just return the current state
    header('Content-Type: application/json');
    echo json_encode([
        'redis_enabled' => RedisManager::$USE_REDIS,
        'message' => 'Redis is currently ' . (RedisManager::$USE_REDIS ? 'enabled' : 'disabled'),
        'help' => 'Use ?enable=false to disable Redis or ?enable=true to enable it'
    ]);
} 