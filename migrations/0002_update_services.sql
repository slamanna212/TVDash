-- Update service configurations based on new requirements

-- Remove Google Workspace (handled separately in productivity checks, not needed as a service card)
DELETE FROM services WHERE name = 'Google Workspace';

-- Update Proofpoint to use custom Salesforce Community status page
UPDATE services
SET check_type = 'custom',
    statuspage_id = 'https://proofpoint.my.site.com/community/s/proofpoint-current-incidents'
WHERE name = 'Proofpoint';

-- Fix Umbrella URL (confirmed Atlassian Statuspage)
UPDATE services
SET statuspage_id = 'https://status.umbrella.cisco.com'
WHERE name = 'Cisco Umbrella';

-- SonicWall uses StatusHub (already handled correctly in code)
-- No change needed for SonicWall

-- Update Huntress to correct Atlassian statuspage URL
UPDATE services
SET statuspage_id = 'https://huntressstatus.statuspage.io'
WHERE name = 'Huntress';

-- Change CrowdStrike to HTTP check instead of statuspage
UPDATE services
SET check_type = 'http',
    check_url = 'https://falcon.us-2.crowdstrike.com/login',
    statuspage_id = NULL
WHERE name = 'CrowdStrike';
