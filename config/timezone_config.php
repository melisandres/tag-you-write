<?php
/**
 * Timezone Configuration
 * 
 * This file contains timezone settings for the application.
 * When deploying to a server, you may need to adjust these settings.
 */

// The timezone used for database operations
// This should match the timezone of your database server
define('DB_TIMEZONE', 'America/New_York');

// The timezone used for displaying dates to users
// This will be converted to the user's local timezone on the client side
define('DISPLAY_TIMEZONE', 'UTC');

/**
 * Convert a timestamp to the database timezone
 * 
 * @param string $timestamp The timestamp to convert
 * @return string The timestamp in the database timezone
 */
function convertToDbTimezone($timestamp) {
    if ($timestamp === null) {
        return null;
    }
    
    $date = new DateTime($timestamp);
    $date->setTimezone(new DateTimeZone(DB_TIMEZONE));
    return $date->format('Y-m-d H:i:s');
}

/**
 * Convert a timestamp from the database timezone to UTC
 * 
 * @param string $timestamp The timestamp to convert
 * @return string The timestamp in UTC
 */
function convertFromDbTimezone($timestamp) {
    if ($timestamp === null) {
        return null;
    }
    
    $date = new DateTime($timestamp, new DateTimeZone(DB_TIMEZONE));
    $date->setTimezone(new DateTimeZone('UTC'));
    return $date->format('Y-m-d H:i:s');
}
?> 