CREATE TABLE IF NOT EXISTS candidates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(40)  NOT NULL,
  last_name     VARCHAR(40)  NOT NULL,
  ssn           VARCHAR(9),
  dob           DATE,
  day_phone     VARCHAR(10),
  email         VARCHAR(320),
  address1      VARCHAR(100),
  city          VARCHAR(32),
  state         CHAR(2),
  zip           CHAR(5),
  other_id      VARCHAR(20),
  other_id_type CHAR(1)
);
