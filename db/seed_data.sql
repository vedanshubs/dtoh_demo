-- Truncate and re-seed (idempotent)
TRUNCATE TABLE candidates;
TRUNCATE TABLE test_types;

-- 10 candidates: realistic US addresses, varied ID types
-- SSNs and DOBs are fictional for demo use only
INSERT INTO candidates
  (first_name, last_name, ssn, dob, day_phone, email, address1, city, state, zip, other_id, other_id_type)
VALUES
  ('James',   'Hartley',  '312445678', '1988-04-12', '2125550101', 'james.hartley@example.com',  '245 Park Ave, Apt 12B',    'New York',      'NY', '10017', 'DL-NY-8812345',  'D'),
  ('Sofia',   'Morales',  '423556789', '1992-09-23', '2015550202', 'sofia.morales@example.com',  '88 Hudson St, Apt 3',      'Jersey City',   'NJ', '07302', 'PP-US-23456789', 'P'),
  ('Marcus',  'Webb',     '534667890', '1985-11-07', '3125550303', 'marcus.webb@example.com',    '1500 S Lake Shore Dr',     'Chicago',       'IL', '60605', 'DL-IL-5534567',  'D'),
  ('Priya',   'Nair',     '645778901', '1995-02-14', '4155550404', 'priya.nair@example.com',     '450 Post St, Suite 200',   'San Francisco', 'CA', '94102', 'EMP-UBS-00412',  'E'),
  ('Daniel',  'Okoye',    '756889012', '1990-06-30', '7135550505', 'daniel.okoye@example.com',   '3200 Main St',             'Houston',       'TX', '77002', 'DL-TX-7756789',  'D'),
  ('Rachel',  'Kim',      '867990123', '1993-08-18', '2125550606', 'rachel.kim@example.com',     '310 W 72nd St, Apt 8F',    'New York',      'NY', '10023', 'PP-US-34567890', 'P'),
  ('Tom',     'Bruckner', '978001234', '1983-03-22', '2035550707', 'tom.bruckner@example.com',   '67 Atlantic St',           'Stamford',      'CT', '06901', 'DL-CT-9978012',  'D'),
  ('Amara',   'Diallo',   '189112345', '1997-12-05', '3055550808', 'amara.diallo@example.com',   '1000 Brickell Ave, Fl 3',  'Miami',         'FL', '33131', 'EMP-UBS-00837',  'E'),
  ('Wei',     'Zhang',    '290223456', '1989-07-16', '2065550909', 'wei.zhang@example.com',      '500 4th Ave S, Suite 110', 'Seattle',       'WA', '98104', 'DL-WA-2290234',  'D'),
  ('Natasha', 'Petrov',   '301334567', '1991-04-29', '6175551010', 'natasha.petrov@example.com', '200 State St, Apt 5C',     'Boston',        'MA', '02109', 'PP-US-45678901', 'P');

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
