-- POC 2 reference / lookup data
-- Idempotent: safe to re-run (uses INSERT IGNORE)

INSERT IGNORE INTO StatusType (StatusTypeId, DisplayName, SystemName) VALUES
  (1, 'Order Created – Awaiting Donor',   'order_created'),
  (2, 'Pending Collection',               'pending_collection'),
  (3, 'Collected – In Transit',           'collected_in_transit'),
  (4, 'At Laboratory',                    'at_laboratory'),
  (5, 'Lab Reported – MRO Review',        'lab_reported_mro'),
  (6, 'MRO Verified – Pending Delivery',  'mro_verified'),
  (7, 'Completed',                        'completed');

INSERT IGNORE INTO ResultType (ResultTypeId, DisplayName, SystemName) VALUES
  (1, 'Negative',           'negative'),
  (2, 'Positive',           'positive'),
  (3, 'Test Not Performed', 'not_performed'),
  (4, 'Cancelled',          'cancelled'),
  (5, 'No Show',            'no_show'),
  (6, 'Rejected Specimen',  'rejected');

INSERT IGNORE INTO IndustryType (IndustryTypeId, DisplayName, SystemName, IsDOT) VALUES
  (1, 'Non-DOT', 'non_dot', 0),
  (2, 'DOT',     'dot',     1);

INSERT IGNORE INTO SampleType (SampleTypeId, DisplayName, SystemName) VALUES
  (1, 'Urine',      'urine'),
  (2, 'Hair',       'hair'),
  (3, 'Oral Fluid', 'oral_fluid'),
  (4, 'Breath',     'breath');

INSERT IGNORE INTO TestReason (TestReasonId, TestReasonTitle, Abbreviation, IsDrug) VALUES
  (1, 'Pre-Employment', 'PE',  1),
  (2, 'Random',         'RA',  1),
  (3, 'For Cause',      'FC',  1),
  (4, 'Post-Accident',  'PA',  1),
  (5, 'Return to Duty', 'RTD', 1);

INSERT IGNORE INTO Substance (SubstanceId, DisplayName, SystemName, AnalyteID, SpecimenType) VALUES
  (1, 'THC/Marijuana',              'thc',             'THC', 'Urine'),
  (2, 'Cocaine Metabolites',        'cocaine',         'COC', 'Urine'),
  (3, 'Amphetamines',               'amphetamines',    'AMP', 'Urine'),
  (4, 'Opiates (Codeine/Morphine)', 'opiates',         'OPI', 'Urine'),
  (5, 'Oxycodone',                  'oxycodone',       'OXY', 'Urine'),
  (6, 'PCP',                        'pcp',             'PCP', 'Urine'),
  (7, 'Methamphetamines',           'methamphetamine', 'MET', 'Urine'),
  (8, 'Benzodiazepines',            'benzodiazepines', 'BZO', 'Urine');
