<?php
/**
 * Router script for PHP built-in server
 * Simple router - just passes everything to index.php
 * Let index.php handle all routing and language logic
 */

// Get the requested URI
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// If the file exists and is not a directory, serve it directly (for assets, etc.)
if ($uri !== '/' && file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false; // Serve the file as-is
}

// For everything else, just pass the URI path to index.php
// index.php will handle language routing, redirects, etc.
$path = ltrim($uri, '/');
$_GET['url'] = $path ?: '/';

// Include index.php - it handles everything
require __DIR__ . '/index.php';

