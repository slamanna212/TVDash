-- Migration: Add Verizon Business ISP
-- Description: Add Verizon Business with AS701 (primary) and AS6167 (secondary)

INSERT INTO local_isps (name, primary_asn, secondary_asns, display_order) VALUES
    ('Verizon Business', 701, '["6167"]', 3);
