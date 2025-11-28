-- Add column to store component group filters for statuspage services
-- Format: JSON array of group names, e.g., '["Group 1", "Group 2"]'
-- NULL means "monitor all components" (backward compatible)
-- Skip if column already exists (migration may have partially run)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll just update the services
-- The column was added in a previous partial migration run

-- Update Datto to use shared Kaseya status page with specific groups
UPDATE services
SET statuspage_id = 'https://status.kaseya.com',
    component_groups = '["Datto BCDR Devices", "Datto SaaS Protection", "Endpoint Backup V2"]'
WHERE name = 'Datto';

-- Update IT Glue to use shared Kaseya status page with its specific group
UPDATE services
SET statuspage_id = 'https://status.kaseya.com',
    component_groups = '["IT Glue"]'
WHERE name = 'IT Glue';
