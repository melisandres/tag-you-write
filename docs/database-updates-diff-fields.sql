-- Add diff fields to text table
-- Run this on both local and server databases

ALTER TABLE `text` 
ADD COLUMN `diff_json` JSON NULL AFTER `note_date`,
ADD COLUMN `diff_count` INT NULL AFTER `diff_json`;

-- Note: 
-- - diff_json stores the diff blocks as JSON: [{"type": "equal|delete|insert", "text": "..."}, ...]
-- - diff_count stores the word count of differences
-- - Both fields are NULL for drafts (diffs are only generated when publishing)
-- - For root texts (parent_id IS NULL), diff compares to empty string

