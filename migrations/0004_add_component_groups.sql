-- Add column to store component group filters for statuspage services
-- Format: JSON array of group names, e.g., '["Group 1", "Group 2"]'
-- NULL means "monitor all components" (backward compatible)
ALTER TABLE services ADD COLUMN component_groups TEXT;

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
