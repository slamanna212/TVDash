-- Migration: Add Astound ISP (Wave Broadband)
-- Description: Add Astound/Wave Broadband with AS22759

INSERT INTO local_isps (name, primary_asn, secondary_asns, display_order) VALUES
    ('Astound (Wave)', 22759, NULL, 4);
