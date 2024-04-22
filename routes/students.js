var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();

function getDb() {
  return new sqlite3.Database('./data/db.sqlite', sqlite3.OPEN_READWRITE, (err) => {
    if (err) console.error(err.message);
  });
}

// Route to display dropdown of ACTIVE students or a specific student's dashboard
router.get('/', (req, res) => {
  const db = getDb();
  if (req.query.studentid) {
    // Show detailed student dashboard with slots if a student ID is specified
    const studentid = req.query.studentid;
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
                LEFT JOIN coaches ON slots.coachid = coaches.cid`, (err, joined) => {
          console.log("Here is the joined table.")
          console.log(joined)
          if (err) {console.log('Database error for joined'); return;}
        }); // Debug that prints the whole joined table
        console.log(req.query);
      } // Debug stuff to print database tables and query.

      var message = "";

      if (req.query.action && req.query.action == "book") {
        try {
         coach = req.query.select.split("timestamp")[0].replace("coach-","");
         stamp = req.query.select.split("time")[1].replace("stamp-","");
         // This is really stupid and hacky.
         console.log(coach)
         console.log(stamp)
          db.run(`
            UPDATE slots
            SET status = ?, studentID = ?
            WHERE timestamp = ? AND coachid = ?;
            `, [1, req.query.studentid, stamp, coach], function(err) {
              console.log("Booked.");
              message = "booked";
              if (err) {
                console.error('Failed to add rating', err.message);
                message = "parseerror";
              }
            }); // Add score to database 
        } catch(e) {
          console.log(e);
          console.log("Couldn't parse the query.")
          message = "parseerror";
        } // try block
      } // If there's a query in the URL to book a slot.

      db.all(`SELECT * FROM students WHERE sid = ?`, [studentid], (err, student) => {
        try {
          console.log("Name: " + student[0].sid + " / Name: " + student[0].sname + " / Phone: " + student[0].sphone + " / Status: " + student[0].sstatus);
        } catch(e) {
          console.log(e);
          res.status(500).send('Database error fetching student details');
          return;
        }
        if (err) {
          res.status(500).send('Database error fetching student details');
          return;
        }
        // Fetch slots for the student
        db.all(`SELECT *
                FROM slots 
                LEFT JOIN coaches ON slots.coachid = coaches.cid 
                WHERE slots.studentid = ? AND (slots.timestamp >= datetime('now') AND slots.status = 1)`, [studentid], (err, upcomingSlots) => {
          if (err) {
            console.log(err);
            res.status(500).send('Logged in as ' + student[0].sname + '. Database error fetching slots');
            return;
          }
          console.log("Number of upcoming slots: " + upcomingSlots.length);
          // console.log(slots[0].timestamp);
          db.all(`SELECT *
                  FROM slots 
                  LEFT JOIN coaches ON slots.coachid = coaches.cid 
                  WHERE slots.studentid = ? AND (slots.timestamp < datetime('now') AND slots.status = 1)
                  ORDER BY timestamp ASC`, [studentid], (err, actionNeededSlots) => {
            if (err) {
              console.log(err);
              res.status(500).send('Logged in as ' + student[0].sname + '. Database error fetching pending-writeup slots');
              return;
            }
            console.log("Number of actionNeeded slots: " + actionNeededSlots.length);
            // console.log(slots[0].timestamp);
            db.all(`SELECT *
                    FROM slots 
                    LEFT JOIN coaches ON slots.coachid = coaches.cid 
                    WHERE slots.studentid = ? AND (slots.timestamp < datetime('now') AND slots.status != 1 AND slots.status != 0)`, [studentid], (err, pastSlots) => {
              if (err) {
                console.log(err);
                res.status(500).send('Logged in as ' + student[0].sname + '. Database error fetching past slots');
                return;
              }
              console.log("Number of past slots: " + pastSlots.length);
                db.all(`SELECT *
                      FROM slots 
                      LEFT JOIN coaches ON slots.coachid = coaches.cid 
                      WHERE (slots.timestamp > datetime('now') AND slots.status == 0)`, (err, openSlots) => {
                if (err) {
                  console.log(err);
                  res.status(500).send('Logged in as ' + student[0].sname + '. Database error fetching open slots');
                  return;
                }
                console.log("Number of open slots: " + openSlots.length);
                // console.log(slots[0].timestamp);
                res.render('students', { student: student[0], upcomingSlots: upcomingSlots, actionNeededSlots: actionNeededSlots , pastSlots: pastSlots, openSlots: openSlots, message: message });
                db.close();
              }); // select all open slots for that student
            }); // select all past slots for that student
          }); // select all elapsed, booked slots (i.e. ones that need to be written up) for that student
        }); // select all upcoming slots for that student ID
      }); // select data for the logged-in student
    }); // db serialize
  } else {
    // If no query param for a student, just load the initial selection page
    db.all(`SELECT sname, sid FROM students WHERE sstatus = "ACTIVE"`, [], (err, students) => {
      if (err) {
        res.status(500).send('Database error');
        return;
      }
      res.render('students', { students: students });
      db.close();
    });
  } // block to show default student select page
}); // this is the route

module.exports = router;