CREATE TABLE IF NOT EXISTS test_types (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(100) NOT NULL,
  service_identifier VARCHAR(50)  NOT NULL,
  specimen_type      CHAR(1)      NOT NULL,
  default_reason     CHAR(2)      NOT NULL
);
