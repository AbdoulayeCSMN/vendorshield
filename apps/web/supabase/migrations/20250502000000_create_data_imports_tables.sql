-- Phase 1.1: Data Ingestion Infrastructure
-- Tables pour gérer les uploads et la traçabilité
--
-- Isolation multi-tenant : account_id = (select auth.uid()), cohérente avec
-- le schéma VendorShield (cf. 20250315000000_vendorshield_schema.sql).

-- 1. Table data_imports — Traçabilité des imports
CREATE TABLE IF NOT EXISTS data_imports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  filename        varchar(255) NOT NULL,
  file_type       varchar(50) NOT NULL, -- 'csv', 'excel', 'json'
  mode            varchar(20) NOT NULL DEFAULT 'incremental', -- 'incremental', 'full'
  total_rows      integer NOT NULL,
  valid_rows      integer NOT NULL,
  error_rows      integer NOT NULL,
  import_status   varchar(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'done', 'failed'
  quality_score   numeric(5, 2) NOT NULL, -- Pourcentage de lignes valides
  imported_by     uuid NOT NULL REFERENCES auth.users(id),
  imported_at     timestamp with time zone NOT NULL DEFAULT now(),
  dataset_version integer NOT NULL DEFAULT 1,
  error_summary   text, -- JSON ou texte avec résumé des erreurs
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Table data_quality_errors — Détail des erreurs par ligne
CREATE TABLE IF NOT EXISTS data_quality_errors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id       uuid NOT NULL REFERENCES data_imports(id) ON DELETE CASCADE,
  row_number      integer NOT NULL,
  column_name     varchar(255) NOT NULL,
  error_type      varchar(100) NOT NULL, -- 'missing_value', 'invalid_format', 'out_of_range', 'duplicate', 'inconsistency'
  error_message   text NOT NULL,
  provided_value  text,
  suggested_fix   text,
  severity        varchar(20) NOT NULL, -- 'error', 'warning'
  created_at      timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Table import_mappings — Configuration des colonnes pour chaque organisation
CREATE TABLE IF NOT EXISTS import_mappings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_column   varchar(255) NOT NULL, -- Nom colonne fichier source
  target_field    varchar(255) NOT NULL, -- Nom champ cible (supplier_id, delivery_date, etc.)
  mapping_type    varchar(50) NOT NULL DEFAULT 'direct', -- 'direct', 'transform', 'enum_map'
  transform_rule  text, -- SQL/JS expression pour transformation
  is_required     boolean NOT NULL DEFAULT false,
  is_key          boolean NOT NULL DEFAULT false, -- Champ clé pour déduplication
  priority        integer NOT NULL DEFAULT 0,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id, source_column, target_field)
);

-- 4. Index pour performances
CREATE INDEX IF NOT EXISTS idx_data_imports_account_id ON data_imports(account_id);
CREATE INDEX IF NOT EXISTS idx_data_imports_import_status ON data_imports(import_status);
CREATE INDEX IF NOT EXISTS idx_data_imports_imported_at ON data_imports(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_quality_errors_import_id ON data_quality_errors(import_id);
CREATE INDEX IF NOT EXISTS idx_import_mappings_account_id ON import_mappings(account_id);

-- 5. RLS Policies — isolation par account_id = auth.uid()
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_imports_select" ON data_imports
  FOR SELECT TO authenticated
  USING (account_id = (select auth.uid()));

CREATE POLICY "data_imports_insert" ON data_imports
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (select auth.uid()));

CREATE POLICY "data_imports_update" ON data_imports
  FOR UPDATE TO authenticated
  USING (account_id = (select auth.uid()))
  WITH CHECK (account_id = (select auth.uid()));

CREATE POLICY "data_quality_errors_select" ON data_quality_errors
  FOR SELECT TO authenticated
  USING (import_id IN (
    SELECT id FROM data_imports
    WHERE account_id = (select auth.uid())
  ));

CREATE POLICY "data_quality_errors_insert" ON data_quality_errors
  FOR INSERT TO authenticated
  WITH CHECK (import_id IN (
    SELECT id FROM data_imports
    WHERE account_id = (select auth.uid())
  ));

CREATE POLICY "import_mappings_all" ON import_mappings
  FOR ALL TO authenticated
  USING (account_id = (select auth.uid()))
  WITH CHECK (account_id = (select auth.uid()));

-- 6. Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_data_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_data_imports_updated_at
BEFORE UPDATE ON data_imports
FOR EACH ROW
EXECUTE FUNCTION update_data_imports_updated_at();

CREATE OR REPLACE FUNCTION update_import_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_import_mappings_updated_at
BEFORE UPDATE ON import_mappings
FOR EACH ROW
EXECUTE FUNCTION update_import_mappings_updated_at();
