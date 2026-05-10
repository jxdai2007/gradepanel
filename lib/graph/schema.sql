-- lib/graph/schema.sql
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  professor_id TEXT,
  term TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('midterm','final','hw','quiz')),
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS rubric_items (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  description TEXT NOT NULL,
  max_points REAL NOT NULL,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (parent_id) REFERENCES concepts(id)
);

CREATE TABLE IF NOT EXISTS rubric_concepts (
  rubric_item_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  PRIMARY KEY (rubric_item_id, concept_id),
  FOREIGN KEY (rubric_item_id) REFERENCES rubric_items(id),
  FOREIGN KEY (concept_id) REFERENCES concepts(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id_anon TEXT,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);

CREATE TABLE IF NOT EXISTS deductions (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  rubric_item_id TEXT NOT NULL,
  ta_id TEXT,
  points_deducted REAL NOT NULL,
  reason TEXT NOT NULL,
  comment TEXT,
  location_line_start INTEGER,
  location_line_end INTEGER,
  location_quote TEXT,
  source TEXT CHECK(source IN ('panel','precedent_validated','ta_override','bootstrap')),
  grounding_confidence REAL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (rubric_item_id) REFERENCES rubric_items(id)
);

CREATE TABLE IF NOT EXISTS deduction_concepts (
  deduction_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  PRIMARY KEY (deduction_id, concept_id),
  FOREIGN KEY (deduction_id) REFERENCES deductions(id),
  FOREIGN KEY (concept_id) REFERENCES concepts(id)
);

CREATE TABLE IF NOT EXISTS deduction_embeddings (
  deduction_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,
  FOREIGN KEY (deduction_id) REFERENCES deductions(id)
);

CREATE TABLE IF NOT EXISTS ta_actions (
  id TEXT PRIMARY KEY,
  deduction_id TEXT NOT NULL,
  action TEXT CHECK(action IN ('accept','edit','reject','add_to_graph','accept_once')),
  edited_points REAL,
  edited_reason TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (deduction_id) REFERENCES deductions(id)
);

CREATE TABLE IF NOT EXISTS regrade_requests (
  id TEXT PRIMARY KEY,
  deduction_id TEXT NOT NULL,
  student_argument TEXT NOT NULL,
  argument_embedding BLOB,
  auto_response TEXT,
  ta_action TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (deduction_id) REFERENCES deductions(id)
);

CREATE INDEX IF NOT EXISTS idx_deductions_rubric ON deductions(rubric_item_id);
CREATE INDEX IF NOT EXISTS idx_deduction_concepts_concept ON deduction_concepts(concept_id);
CREATE INDEX IF NOT EXISTS idx_deductions_submission ON deductions(submission_id);
