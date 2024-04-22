const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/db.sqlite', sqlite3.OPEN_READWRITE, (err) => {
  if (err) console.error('Error opening database', err.message);
});

function insertCoaches() {
  //  id INTEGER PRIMARY KEY AUTOINCREMENT,
  //  name TEXT NOT NULL UNIQUE,
  //  phone TEXT,
  //  status TEXT
  const sql = `
    INSERT INTO coaches (cname, cphone, cstatus) VALUES 
    ('Nestor',               '0123456789', 'INACTIVE'),
    ('Socrates',             '1234567890', 'INACTIVE'),
    ('Plato',                '2345678901', 'ACTIVE'),
    ('Aristotle',            '3456789012', 'ACTIVE'),
    ('Theophrastus',         '4567890123', 'ACTIVE'),
    ('Στράτων ὁ Λαμψακηνός', '5678901234', 'ACTIVE')
    ON CONFLICT(cname) DO UPDATE SET
    cphone = excluded.cphone, 
    cstatus = excluded.cstatus;
  `;
  db.run(sql, function(err) {
    if (err) {
      console.error('Error inserting data into coaches', err.message);
    } else {
      console.log(`Successfully inserted ${this.changes} records into coaches`);
    }
  });
}

function insertStudents() {
  //  id INTEGER PRIMARY KEY AUTOINCREMENT,
  //  name TEXT NOT NULL UNIQUE,
  //  phone TEXT,
  //  status TEXT
  const sql = `
    INSERT INTO students (sname, sphone, sstatus) VALUES 
    ('Ajax',         '6789012345', 'INACTIVE'),
    ('Τηλέμαχος',    '7890123456', 'INACTIVE'),
    ('Alcibiades',   '8901234567', 'ACTIVE'),
    ('Alexandros',   '9012345678', 'ACTIVE'),
    ('Themistocles', '9876543210', 'ACTIVE')
    ON CONFLICT(sname) DO UPDATE SET
    sphone = excluded.sphone, 
    sstatus = excluded.sstatus;
  `;
  db.run(sql, function(err) {
    if (err) {
      console.error('Error inserting data into students', err.message);
    } else {
      console.log(`Successfully inserted ${this.changes} records into students`);
    }
  });
}

function insertSlots() {
  //  slotid INTEGER PRIMARY KEY AUTOINCREMENT,
  //  timestamp DATETIME,
  //  status INTEGER,
  //  score INTEGER,
  //  note TEXT,
  //  coachid INTEGER,
  //  studentid INTEGER,
  //  FOREIGN KEY (coachid) REFERENCES coaches(id),
  //  FOREIGN KEY (studentid) REFERENCES students(id)

  // statuses:
  // 0: unbooked (coach has created an available slot for this time)
  // 1: booked (a student has selected this slot for an appointment; this status is had by appointments after they're booked and before they're scored, which means that they may or may not have already happened, but nothing in the database entry changes when the timestamp of a slot elapses. however, coaches will be prompted to take SOME action for status1 appointments that have already happened; they must either score them, or mark them as cancelled by themselves, or unattended by the student)
  // 2: scored (coach has given a score and optionally written a freeform text note on the meeting)
  // 3: cancelled by coach
  // 4: no-show by student
  // 5: elapsed without ever having been booked
  // 6: other (idk)

  //|timestamp            |st|score|note                                                         |co|student
  const sql = `
    INSERT INTO slots (timestamp, status, score, note, coachid, studentid) VALUES 
    ('1999-11-22 11:22:33', 2, 4,    'Taught Alcibiades about the nature of the Good',             2, 3   ),
    ('2019-10-20 08:09:10', 4, NULL, 'I had hoped to receive Telemachus but I saw him not',        2, 1   ),
    ('2024-01-02 03:04:05', 0, NULL, NULL,                                                         6, NULL),
    ('2024-02-03 04:05:06', 1, NULL, NULL,                                                         4, 4   ),
    ('2024-02-03 04:05:06', 2, 3,    'Kid did NOT understand hypotenuses at all!',                 4, 4   ),
    ('2024-02-03 04:05:06', 3, NULL, 'We decided to skip the lesson and watch a wrestling match.', 4, NULL),
    ('2024-01-10 09:05:06', 1, NULL, NULL,                                                         3, 5   ),
    ('2024-02-29 12:05:06', 1, NULL, NULL,                                                         6, 5   ),
    ('2024-07-08 09:05:06', 1, NULL, NULL,                                                         3, 5   ),
    ('2024-07-08 11:05:06', 0, NULL, NULL,                                                         3, NULL),
    ('2020-03-08 12:05:06', 2, 5,    'That kid knows ALL about hypotenuses.',                      6, 5   ),
    ('2024-08-15 09:00:00', 0, NULL, 'Available for philosophical discussion',                     3, NULL),
    ('2024-08-15 10:00:00', 1, NULL, 'Scheduled to discuss ethics',                                4, 5   ),
    ('2022-08-15 11:00:00', 2, 5,    'Deep insight into nature of war and leadership',             1, 3   ),
    ('2023-08-16 09:00:00', 3, NULL, 'Cancelled due to sudden illness',                            1, 2   ),
    ('2023-08-16 10:00:00', 4, NULL, 'Alexandros busy leading troops',                             4, 4   ),
    ('2023-08-17 10:00:00', 1, NULL, 'Philosophy of science discussion',                           3, 3   ),
    ('2023-08-17 11:00:00', 2, 2,    'Discussion on virtues lacked depth',                         6, 2   ),
    ('2024-08-18 09:00:00', 1, NULL, 'Aristotle to discuss political theory',                      2, 4   ),
    ('2023-08-18 10:00:00', 2, 3,    'Good progress in understanding realism',                     2, 5   ),
    ('2024-08-18 11:00:00', 0, NULL, 'Free slot for exploring poetics',                            2, NULL),
    ('2024-08-19 09:00:00', 0, NULL, 'Open for inquiry into natural sciences',                     3, NULL),
    ('2024-09-19 09:00:00', 0, NULL, 'Open for inquiry into natural sciences',                     3, NULL),
    ('2024-08-20 10:00:00', 0, NULL, NULL,                                                         3, NULL),
    ('2024-08-20 10:00:00', 0, NULL, NULL,                                                         4, NULL),
    ('2024-08-22 10:00:00', 0, NULL, NULL,                                                         5, NULL),
    ('2024-08-23 10:00:00', 0, NULL, NULL,                                                         6, NULL),
    ('2021-08-19 11:00:00', 3, NULL, 'Cancelled by Theophrastus',                                  5, 3   )
    ON CONFLICT(timestamp, coachid) DO UPDATE SET
    timestamp = excluded.timestamp,
    status = excluded.status,
    score = excluded.score,
    note = excluded.note,
    coachid = excluded.coachid,
    studentid = excluded.studentid;
  `;
  db.run(sql, function(err) {
    if (err) {
      console.error('Error inserting data into slots', err.message);
    } else {
      console.log(`Successfully inserted ${this.changes} records into slots`);
    }
  });
}

insertCoaches();
insertStudents();
insertSlots();

db.close((err) => {
  if (err) console.error('Error closing database', err.message);
});