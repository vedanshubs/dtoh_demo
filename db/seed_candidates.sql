INSERT INTO candidates (first_name, last_name, ssn, dob, day_phone, email, address1, city, state, zip, other_id, other_id_type)
VALUES
  ('Alice',   'Smith',   '123456789', '1990-03-15', '3125550101', 'alice@example.com',  '123 Main St',   'Chicago',     'IL', '60601', 'DL123456', 'D'),
  ('Bob',     'Jones',   '234567890', '1985-07-22', '2125550202', 'bob@example.com',    '456 Park Ave',  'New York',    'NY', '10001', 'DL234567', 'D'),
  ('Carol',   'Lee',     '345678901', '1992-11-08', '3105550303', 'carol@example.com',  '789 Sunset Bl', 'Los Angeles', 'CA', '90001', 'PP345678', 'P'),
  ('David',   'Chen',    '456789012', '1988-01-30', '7135550404', 'david@example.com',  '321 Rice Blvd', 'Houston',     'TX', '77001', 'DL456789', 'D'),
  ('Emma',    'Wilson',  '567890123', '1995-05-19', '6025550505', 'emma@example.com',   '654 Desert Rd', 'Phoenix',     'AZ', '85001', 'DL567890', 'D');

INSERT INTO test_types (name, service_identifier, specimen_type, default_reason)
VALUES
  ('5-Panel Urine',         '5PANEL_U',  'U', 'PE'),
  ('10-Panel Urine',        '10PANEL_U', 'U', 'PE'),
  ('Hair Follicle 5-Panel', '5PANEL_H',  'H', 'PE'),
  ('Breath Alcohol',        'BAT',       'B', 'RA'),
  ('DOT 5-Panel Urine',     'DOT5_U',   'U', 'PE');
