-- Fix Sonicwall to use HTTP check for NSM service
-- Check the actual NSM service instead of the status page

UPDATE services
SET name = 'Sonicwall NSM',
    check_type = 'http',
    check_url = 'https://nsm-uswest.sonicwall.com',
    statuspage_id = NULL
WHERE name = 'SonicWall';
