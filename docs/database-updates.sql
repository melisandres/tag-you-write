-- Add visited_at column to game_invitation table
-- This tracks when an invitation was first visited (not when it was accepted)

ALTER TABLE game_invitation 
ADD COLUMN visited_at DATETIME NULL 
AFTER invited_at;

-- Optional: Add an index for performance if you plan to query by visited_at
-- CREATE INDEX idx_game_invitation_visited_at ON game_invitation(visited_at);

-- ============================================================================
-- Email Queue System
-- ============================================================================

-- Create email_queue table for queuing emails in production
CREATE TABLE IF NOT EXISTS email_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    subject_params JSON NULL,
    message_key VARCHAR(255) NOT NULL,
    message_params JSON NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    sent_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status_created (status, created_at),
    INDEX idx_recipient_email (recipient_email)
);

-- ============================================================================
-- Game Access Control Updates
-- ============================================================================

-- 1. Rename open_for_writers to joinable_by_all for semantic clarity
ALTER TABLE game 
CHANGE COLUMN open_for_writers joinable_by_all TINYINT(1) DEFAULT 1;

-- 2. Add visible_to_all column to control game visibility
ALTER TABLE game 
ADD COLUMN visible_to_all TINYINT(1) DEFAULT 1 
AFTER joinable_by_all;

-- 3. Optional: Add indexes for performance on permission queries
-- CREATE INDEX idx_game_joinable_by_all ON game(joinable_by_all);
-- CREATE INDEX idx_game_visible_to_all ON game(visible_to_all);

-- ============================================================================
-- Email Queue Subject Parameters Update
-- ============================================================================

-- Add subject_params column to email_queue table
ALTER TABLE email_queue 
ADD COLUMN subject_params JSON NULL 
AFTER subject;

-- ============================================================================
-- Activity Tracking System Updates
-- ============================================================================

-- Update writer_activity.activity_type ENUM to include new activity types
-- This fixes the "Data truncated" error when storing 'other', 'iterating', 'adding_note'
ALTER TABLE writer_activity 
MODIFY COLUMN activity_type ENUM('browsing', 'editing', 'starting_game', 'iterating', 'adding_note', 'other') NOT NULL; 