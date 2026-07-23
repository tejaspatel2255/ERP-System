CREATE TABLE IF NOT EXISTS doc_number_sequences (
  doc_key VARCHAR(50) PRIMARY KEY,   -- e.g. 'QT-202607', 'PO-202607'
  last_value INTEGER NOT NULL DEFAULT 0
);
