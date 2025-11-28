-- Update Proofpoint to use unofficial status page (easier to parse)
UPDATE services
SET statuspage_id = 'https://proofpointstatus.com/'
WHERE name = 'Proofpoint';
