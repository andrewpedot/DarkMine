-- Add reference_pdf column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reference_pdf TEXT;
