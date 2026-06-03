-- One-time patch: replace legacy fake service codes with 1001
-- (the confirmed working eScreen service identifier for this account)
--
-- Background: original seed used placeholder codes (5PANEL_U, 10PANEL_U, etc.)
-- that eScreen does not recognise, causing GetCollectionSites to return 0 sites.
-- 1001 is the correct code for GetCollectionSites under ElectronicClientId=UB-Staffing.
--
-- Run once on any environment that still has the old codes:
--   mysql -u escreen -pescreen escreen < db/patch_service_identifiers.sql

UPDATE test_types SET service_identifier = '1001' WHERE service_identifier != '1001';

-- Verify
SELECT id, name, service_identifier, specimen_type FROM test_types ORDER BY id;
