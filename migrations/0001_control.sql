CREATE TABLE control_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
);

INSERT INTO control_projects (id, name) VALUES
  ('mahasib-company', 'المحاسب برو'),
  ('almahasib-offline', 'المحاسب برو دسكتوب أوف لاين'),
  ('mahasib-cashier', 'المحاسب كاشير'),
  ('scanner', 'الأرجوان سكنر'),
  ('almoraqeb', 'المراقب برو'),
  ('mawlada', 'المولدة برو'),
  ('salonati', 'صالوناتي'),
  ('jamiati', 'جامعتي'),
  ('alayin', 'مندوبي العين'),
  ('remote-tools', 'أدوات التحكم عن بعد'),
  ('telegram-views', 'مشاهدات تليغرام برو'),
  ('alarjwan-softwear', 'الأرجوان سوفت وير'),
  ('control-center', 'الأرجوان سنتر');

CREATE TABLE control_licenses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES control_projects(id),
  customer TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('trial', 'annual', 'permanent')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'active', 'rejected', 'revoked')),
  key_hash TEXT UNIQUE,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  expires_at TEXT
);
CREATE INDEX control_licenses_project ON control_licenses(project_id, created_at DESC);
