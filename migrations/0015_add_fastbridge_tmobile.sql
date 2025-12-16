-- Migration: Add FastBridge Fiber and T-Mobile ISPs
-- Description: Add FastBridge Fiber (AS1088) and T-Mobile (AS21928)

INSERT INTO local_isps (name, primary_asn, secondary_asns, display_order) VALUES
    ('FastBridge Fiber', 1088, NULL, 5),
    ('T-Mobile', 21928, NULL, 6);
