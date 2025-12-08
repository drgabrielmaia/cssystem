-- Add scheduled_date column to auto_messages table
-- This column will store dates in YYYY-MM-DD format for scheduling messages on specific dates
-- The column is nullable so existing records won't break

ALTER TABLE auto_messages
ADD COLUMN scheduled_date DATE;

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'auto_messages'
ORDER BY ordinal_position;