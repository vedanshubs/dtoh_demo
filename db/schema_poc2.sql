-- POC 2: DTOH table structure in MySQL
-- Column names match production SQL Server schema exactly.

CREATE TABLE IF NOT EXISTS StatusType (
  StatusTypeId  INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName   VARCHAR(100) NOT NULL,
  SystemName    VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS ResultType (
  ResultTypeId  INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName   VARCHAR(100) NOT NULL,
  SystemName    VARCHAR(50)  NOT NULL,
  IsDrug        TINYINT(1)   NOT NULL DEFAULT 1,
  IsOccHealth   TINYINT(1)   NOT NULL DEFAULT 0,
  IsSubstance   TINYINT(1)   NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS IndustryType (
  IndustryTypeId INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName    VARCHAR(100) NOT NULL,
  SystemName     VARCHAR(50)  NOT NULL,
  IsDOT          TINYINT(1)   NOT NULL
);

CREATE TABLE IF NOT EXISTS SampleType (
  SampleTypeId INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName  VARCHAR(100) NOT NULL,
  SystemName   VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS TestReason (
  TestReasonId    INT AUTO_INCREMENT PRIMARY KEY,
  TestReasonTitle VARCHAR(150) NOT NULL,
  Abbreviation    VARCHAR(50)  NULL,
  IsDrug          TINYINT(1)   NOT NULL DEFAULT 1,
  IsOccHealth     TINYINT(1)   NOT NULL DEFAULT 0,
  SystemName      VARCHAR(50)  NULL
);

CREATE TABLE IF NOT EXISTS Substance (
  SubstanceId   INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName   VARCHAR(100) NULL,
  SystemName    VARCHAR(50)  NULL,
  AnalyteID     VARCHAR(50)  NULL,
  SpecimenType  VARCHAR(50)  NULL
);

CREATE TABLE IF NOT EXISTS CollectionOrder (
  CollectionOrderId  INT AUTO_INCREMENT PRIMARY KEY,
  AccountNumber      VARCHAR(6)   NULL,
  TestReason         VARCHAR(50)  NULL,
  IsDOT              TINYINT(1)   NOT NULL DEFAULT 0,
  CostCenter         VARCHAR(50)  NULL,
  RecordCreatedDate  DATETIME     NULL,
  StatusTypeId       INT          NULL,
  CreatedOn          DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS TestReport (
  TestReportId            INT AUTO_INCREMENT PRIMARY KEY,
  CollectionOrderId       INT          NULL,
  StatusId                INT          NULL,
  ResultTypeId            INT          NULL,
  IndustryTypeId          INT          NULL,
  DateOfService           DATETIME     NULL,
  ReasonForTest           VARCHAR(100) NULL,
  Regulation              VARCHAR(20)  NULL,
  eScreenStatusCode       VARCHAR(50)  NULL,
  eScreenStatusDescription VARCHAR(255) NULL,
  TestReportAccountNumber VARCHAR(100) NULL,
  CreatedOn               DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS DrugReport (
  DrugReportId        INT AUTO_INCREMENT PRIMARY KEY,
  TestReportId        INT          NOT NULL,
  Disposition         VARCHAR(20)  NULL,
  SampleType          VARCHAR(20)  NULL,
  SpecimenType        VARCHAR(100) NULL,
  CollectionDateTime  DATETIME     NULL,
  LabReceivedDate     DATETIME     NULL,
  LabReportDateTime   DATETIME     NULL,
  MROReceivedDate     DATETIME     NULL,
  VerificationDate    DATETIME     NULL,
  LabName             VARCHAR(100) NULL,
  CreatedOn           DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS PanelResult (
  PanelResultId INT AUTO_INCREMENT PRIMARY KEY,
  DrugReportId  INT          NULL,
  ResultTypeId  INT          NULL,
  PanelName     VARCHAR(255) NULL,
  CreatedOn     DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS SubstanceResult (
  SubstanceResultId INT AUTO_INCREMENT PRIMARY KEY,
  PanelResultId     INT          NULL,
  SubstanceId       INT          NULL,
  AnalyteName       VARCHAR(100) NULL,
  Disposition       VARCHAR(5)   NULL,
  SpecimenType      VARCHAR(20)  NULL,
  SampleTypeId      INT          NULL,
  CreatedOn         DATETIME     NULL
);
