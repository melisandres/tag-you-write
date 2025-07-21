<?php
/**
 * Get the current language
 */
function getCurrentLanguage() {
    return defined('CURRENT_LANGUAGE') ? CURRENT_LANGUAGE : 'en';
}

/**
 * Generate a URL with the current language
 */
function langUrl($path, $language = null) {
    // Use provided language or current language
    $lang = $language ?: getCurrentLanguage();
    
    // If path already starts with a slash, remove it
    $path = ltrim($path, '/');
    
    return '/' . $lang . '/' . $path;
}

/**
 * Translate a key
 */
function translate($key, $replacements = []) {
    $lang = getCurrentLanguage();
    if (!defined('ROOT_DIR')) {
        define('ROOT_DIR', dirname(__DIR__));
    }
    $translations = json_decode(file_get_contents(ROOT_DIR . "translations/{$lang}.json"), true);
    
    // Handle nested keys like "header.home"
    if (strpos($key, '.') !== false) {
        $parts = explode('.', $key);
        $current = $translations;
        
        // Navigate through the nested structure
        foreach ($parts as $part) {
            if (isset($current[$part])) {
                $current = $current[$part];
            } else {
                // If any part of the path doesn't exist, return the key
                return $key;
            }
        }
        
        $text = $current;
    } else {
        // Handle flat keys for backward compatibility
        $text = isset($translations[$key]) ? $translations[$key] : $key;
    }
    
    foreach ($replacements as $placeholder => $value) {
        $text = str_replace("{{$placeholder}}", $value, $text);
    }
    
    return $text;
}
?>
