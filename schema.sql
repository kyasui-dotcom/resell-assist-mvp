DROP TABLE IF EXISTS products_fts;
DROP TABLE IF EXISTS products_fts_config;
DROP TABLE IF EXISTS products_fts_content;
DROP TABLE IF EXISTS products_fts_data;
DROP TABLE IF EXISTS products_fts_docsize;
DROP TABLE IF EXISTS products_fts_idx;
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  series TEXT,
  summary_specs TEXT,
  payload_json TEXT NOT NULL
);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_series ON products(series);
CREATE INDEX idx_products_name ON products(name);
CREATE VIRTUAL TABLE products_fts USING fts5(
  id UNINDEXED,
  name,
  category,
  series,
  summary_specs,
  tokenize='unicode61'
);
