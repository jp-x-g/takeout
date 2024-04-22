const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/db.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('connected to database');
});

const initCoaches = `
CREATE TABLE IF NOT EXISTS coaches (
  cid INTEGER PRIMARY KEY AUTOINCREMENT,
  cname TEXT NOT NULL UNIQUE,
  cphone TEXT,
  cstatus TEXT
  );`;

const initStudents = `
CREATE TABLE IF NOT EXISTS students (
  sid INTEGER PRIMARY KEY AUTOINCREMENT,
  sname TEXT NOT NULL UNIQUE,
  sphone TEXT,
  sstatus TEXT
  );`;

const initSlots = `
CREATE TABLE IF NOT EXISTS slots(
  slotid INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME,
  status INTEGER,
  score INTEGER,
  note TEXT,
  coachid INTEGER,
  studentid INTEGER,
  FOREIGN KEY (coachid) REFERENCES coaches(id),
  FOREIGN KEY (studentid) REFERENCES students(id),
  UNIQUE(timestamp, coachid)
  );`;

// Execute SQL
db.serialize(() => {
  db.run(initCoaches);
  db.run(initStudents);
  db.run(initSlots);
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('closing DB connection');
});