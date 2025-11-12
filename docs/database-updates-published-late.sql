-- ============================================================================
-- Add 'published_late' Status to text_status Table
-- ============================================================================
-- This migration adds a new text status 'published_late' to indicate texts
-- that were published after a game was closed. These texts are visible but
-- were not in the running for winner selection.
--
-- Date: 2024
-- ============================================================================

-- Insert 'published_late' status if it doesn't already exist
-- This makes the migration idempotent (safe to run multiple times)
INSERT INTO text_status (status)
SELECT 'published_late'
WHERE NOT EXISTS (
    SELECT 1 FROM text_status WHERE status = 'published_late'
);

-- Verify the insertion (optional - can be commented out after verification)
-- SELECT * FROM text_status WHERE status = 'published_late';

