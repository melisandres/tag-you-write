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
?>
