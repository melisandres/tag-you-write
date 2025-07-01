-- Add visited_at column to game_invitation table
-- This tracks when an invitation was first visited (not when it was accepted)

ALTER TABLE game_invitation 
ADD COLUMN visited_at DATETIME NULL 
AFTER invited_at;

-- Optional: Add an index for performance if you plan to query by visited_at
-- CREATE INDEX idx_game_invitation_visited_at ON game_invitation(visited_at);

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