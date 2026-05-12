-- Truncate and re-seed (idempotent)
TRUNCATE TABLE candidates;
TRUNCATE TABLE test_types;

-- 10 candidates: all placed within mock clinic coverage (Manhattan NY, Hudson County NJ, Westchester NY)
-- SSNs and DOBs are fictional for demo use only
INSERT INTO candidates
  (first_name, last_name, ssn, dob, day_phone, email, address1, city, state, zip, other_id, other_id_type)
VALUES
  ('James',   'Hartley',  '312445678', '1988-04-12', '2125550101', 'james.hartley@example.com',  '245 Park Ave, Apt 12B',     'New York',    'NY', '10017', 'DL-NY-8812345',  'D'),
  ('Sofia',   'Morales',  '423556789', '1992-09-23', '2015550202', 'sofia.morales@example.com',  '88 Hudson St, Apt 3',       'Jersey City', 'NJ', '07302', 'PP-US-23456789', 'P'),
  ('Marcus',  'Webb',     '534667890', '1985-11-07', '2015550303', 'marcus.webb@example.com',    '300 Hackensack Ave, Apt 5', 'Kearny',      'NJ', '07032', 'DL-NJ-5534567',  'D'),
  ('Priya',   'Nair',     '645778901', '1995-02-14', '2125550404', 'priya.nair@example.com',     '140 W 57th St, Apt 6A',     'New York',    'NY', '10019', 'EMP-UBS-00412',  'E'),
  ('Daniel',  'Okoye',    '756889012', '1990-06-30', '2015550505', 'daniel.okoye@example.com',   '800 Boulevard East, Apt 2', 'Weehawken',   'NJ', '07086', 'DL-NJ-7756789',  'D'),
  ('Rachel',  'Kim',      '867990123', '1993-08-18', '2125550606', 'rachel.kim@example.com',     '211 E 53rd St, Apt 4D',     'New York',    'NY', '10022', 'PP-US-34567890', 'P'),
  ('Tom',     'Bruckner', '978001234', '1983-03-22', '9145550707', 'tom.bruckner@example.com',   '1 Mamaroneck Ave, Apt 8B',  'White Plains','NY', '10601', 'DL-NY-9978012',  'D'),
  ('Amara',   'Diallo',   '189112345', '1997-12-05', '2125550808', 'amara.diallo@example.com',   '75 Varick St, Fl 3',        'New York',    'NY', '10013', 'EMP-UBS-00837',  'E'),
  ('Wei',     'Zhang',    '290223456', '1989-07-16', '2015550909', 'wei.zhang@example.com',      '700 Park Ave, Apt 12',      'Hoboken',     'NJ', '07030', 'DL-NJ-2290234',  'D'),
  ('Natasha', 'Petrov',   '301334567', '1991-04-29', '9145551010', 'natasha.petrov@example.com', '515 North Ave, Apt 5C',     'New Rochelle','NY', '10801', 'PP-US-45678901', 'P');

-- 6 test types covering 4 specimen types
INSERT INTO test_types
  (name, service_identifier, specimen_type, default_reason)
VALUES
  ('5-Panel Urine',          '5PANEL_U',  'U', 'PE'),
  ('10-Panel Urine',         '10PANEL_U', 'U', 'PE'),
  ('DOT 5-Panel Urine',      'DOT5_U',    'U', 'PE'),
  ('Hair Follicle 5-Panel',  '5PANEL_H',  'H', 'PE'),
  ('Oral Fluid 5-Panel',     '5PANEL_O',  'O', 'PE'),
  ('Breath Alcohol Test',    'BAT',       'B', 'RA');
