-- Migration: Add maintenance flag to status_history
-- This allows us to distinguish scheduled maintenance from actual service degradation
-- Created: 2025-12-04

-- Add is_maintenance column to track when a service is under scheduled maintenance
ALTER TABLE status_history ADD COLUMN is_maintenance INTEGER DEFAULT 0;

-- Create index for efficient maintenance queries
CREATE INDEX idx_status_history_maintenance ON status_history(service_id, is_maintenance, checked_at);
