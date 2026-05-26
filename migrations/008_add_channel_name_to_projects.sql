-- Add channel_name column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS channel_name TEXT;
