-- Update CrowdStrike to use StatusGator page instead of HTTP check
UPDATE services
SET check_type = 'custom',
    check_url = NULL,
    statuspage_id = 'https://statusgator.com/services/crowdstrike'
WHERE name = 'CrowdStrike';
