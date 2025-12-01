-- Add check_method field to services table to distinguish Worker vs GitHub Actions checks
ALTER TABLE services ADD COLUMN check_method TEXT DEFAULT 'worker';

-- Mark geo-restricted services to use GitHub Actions relay
UPDATE services SET check_method = 'github-actions'
WHERE name IN ('Manage', 'Automate', 'ScreenConnect');

-- Add index for efficient filtering in cron jobs
CREATE INDEX idx_services_check_method ON services(check_method);
