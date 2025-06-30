-- Add visited_at column to game_invitation table
-- This tracks when an invitation was first visited (not when it was accepted)

ALTER TABLE game_invitation 
ADD COLUMN visited_at DATETIME NULL 
AFTER invited_at;

-- Optional: Add an index for performance if you plan to query by visited_at
-- CREATE INDEX idx_game_invitation_visited_at ON game_invitation(visited_at); 