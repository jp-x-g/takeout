var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();

function getDb() {
  return new sqlite3.Database('./data/db.sqlite', sqlite3.OPEN_READWRITE, (err) => {
    if (err) console.error(err.message);
  });
}

// Route to display dropdown of ACTIVE coaches or a specific coach's dashboard
router.get('/', (req, res) => {
  const db = getDb();
  if (req.query.coachid) {
    // Show detailed coach dashboard with slots if a coach ID is specified
    const coachId = req.query.coachid;
    db.serialize(() => {
      if("debug" == "no debug"){
        db.all(`SELECT * FROM coaches`, (err, coaches) => {
          console.log("Here is the coaches table.")
          console.log(coaches)
          if (err) {console.log('Database error for coaches'); return;}
        }); // Debug that prints the whole coaches table
        db.all(`SELECT * FROM slots`, (err, slots) => {
          console.log("Here is the slots table.")
          console.log(slots)
          if (err) {console.log('Database error for slots'); return;}
        }); // Debug that prints the whole slots table
        db.all(`SELECT * FROM students`, (err, students) => {
          console.log("Here is the students table.")
          console.log(students)
          if (err) {console.log('Database error for students'); return;}
        }); // Debug that prints the whole students table
        db.all(`SELECT *
                FROM slots 
                LEFT JOIN students ON slots.studentid = students.sid`, (err, joined) => {
          console.log("Here is the joined table.")
          console.log(joined)
          if (err) {console.log('Database error for joined'); return;}
        }); // Debug that prints the whole joined table
        console.log(req.query);
      } // Debug stuff to print database tables and query.

      var message = "";
      if (req.query.action && req.query.action == "add" && req.query.newslotTime) {
        try {
          console.log("Request to add slot for " + req.query.coachid + " at " + req.query.newslotTime);
          //db.all(``)
          // In a fully-featured app, this would do sanity-checking to make sure that:
          
          // 1) the slot was not in the past
          // 2) it did not START in the middle of a previously-existing slot 
          // 3) it did not END in the middle of a previously-existing slot

          // In this app, it does not do these things, and instead allows input error to ruin the user's day

          // SQL timestamps are 1999-11-22 11:22:33
          // JS  timestamps are 1999-11-22T11:22:33
          db.run(`
            INSERT INTO slots (timestamp, status, score, note, coachid, studentid)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [req.query.newslotTime.replace("T", " "), 0, "NULL", "NULL", req.query.coachid, "NULL"], function(err) {
            if (err) {
              console.error('Failed to add new slot due to database error:', err.message);
              res.status(500).send('Failed to add new slot due to database error');
              return;
            }
          });
          console.log("Entry added.");
          message = "added";
        } catch(e) {
          console.log("Couldn't parse the query.")
          message = "parseerror";
        } // try block
      } // If there's a query to add a slot for the coach.

      if (req.query.action && req.query.action == "rate") {
        try {
          console.log(req.query);
          // {
          //   coachid: '3',
          //   action: 'rate',
          //   'rating-2024-04-10 09:05:06': '5',
          //   'notes-2024-04-10 09:05:06': 'Very good progress with the lyre.'
          //   'rating-2024-05-11 12:30': '1',
          //   'notes-2024-05-11 12:30': 'No interest in the lyre whatsoever.'
          // }

          for (const key in req.query) {
            try {
              if (key.startsWith('rating-')) {
                const timestamp = key.substring(7);  // get timestamp
                console.log("timestamp: " + timestamp);
                const score = req.query[key];
                console.log("score: " + score);
                const noteKey = `notes-${timestamp}`;
                console.log("noteKey: " + noteKey);
                const note = req.query[noteKey] || '';  // empty string if not provided
                console.log("note: " + note);
                db.run(`
                  UPDATE slots
                  SET score = ?, note = ?, status = ?
                  WHERE timestamp = ? AND coachid = ?;
                  `, [score, note, 2, timestamp, req.query.coachid], function(err) {
                    console.log("Updated.");
                    message = "updated";
                    if (err) {
                      console.error('Failed to add rating', err.message);
                      message = "parseerror";
                    }
                  }); // Add score to database 
              }
            } catch(e) {
              console.log(e);
              message = "parseerror";
            }
          } // for each entry in the "updates" array
        } catch(e) {
          console.log(e);
          console.log("Couldn't parse the query.")
          message = "parseerror";
        } // try block
      } // If there's a query in the URL to add some ratings/notes/etc.

      db.all(`SELECT * FROM coaches WHERE cid = ?`, [coachId], (err, coach) => {
        try {
          console.log("Name: " + coach[0].cid + " / Name: " + coach[0].cname + " / Phone: " + coach[0].cphone + " / Status: " + coach[0].cstatus);
        } catch(e) {
          console.log(e);
          res.status(500).send('Database error fetching coach details');
          return;
        }
        if (err) {
          res.status(500).send('Database error fetching coach details');
          return;
        }
        // Fetch slots for the coach
        db.all(`SELECT *
                FROM slots 
                LEFT JOIN students ON slots.studentid = students.sid 
                WHERE slots.coachid = ? AND (slots.timestamp >= datetime('now') AND (slots.status = 0 OR slots.status = 1))`, [coachId], (err, upcomingSlots) => {
          if (err) {
            console.log(err);
            res.status(500).send('Logged in as ' + coach[0].cname + '. Database error fetching slots');
            return;
          }
          console.log("Number of upcoming slots: " + upcomingSlots.length);
          // console.log(slots[0].timestamp);
          db.all(`SELECT *
                  FROM slots 
                  LEFT JOIN students ON slots.studentid = students.sid 
                  WHERE slots.coachid = ? AND (slots.timestamp < datetime('now') AND slots.status = 1)
                  ORDER BY timestamp ASC`, [coachId], (err, actionNeededSlots) => {
            if (err) {
              console.log(err);
              res.status(500).send('Logged in as ' + coach[0].cname + '. Database error fetching pending-writeup slots');
              return;
            }
            console.log("Number of actionNeeded slots: " + actionNeededSlots.length);
            // console.log(slots[0].timestamp);
            db.all(`SELECT *
                    FROM slots 
                    LEFT JOIN students ON slots.studentid = students.sid 
                    WHERE slots.coachid = ? AND (slots.timestamp < datetime('now') AND slots.status != 1 AND slots.status != 0)`, [coachId], (err, pastSlots) => {
              if (err) {
                console.log(err);
                res.status(500).send('Logged in as ' + coach[0].cname + '. Database error fetching past slots');
                return;
              }
              console.log("Number of past slots: " + pastSlots.length);
              // console.log(slots[0].timestamp);
              res.render('coaches', { coach: coach[0], upcomingSlots: upcomingSlots, actionNeededSlots: actionNeededSlots , pastSlots: pastSlots, message: message });
              db.close();
            }); // select all past slots for that coach
          }); // select all elapsed, booked slots (i.e. ones that need to be written up) for that coach
        }); // select all upcoming slots for that coach ID
      }); // select data for the logged-in coach
    }); // db serialize
  } else {
    // If no query param for a coach, just load the initial selection page
    db.all(`SELECT cname, cid FROM coaches WHERE cstatus = "ACTIVE"`, [], (err, coaches) => {
      if (err) {
        res.status(500).send('Database error');
        return;
      }
      res.render('coaches', { coaches: coaches });
      db.close();
    });
  } // block to show default coach select page
}); // this is the route

module.exports = router;