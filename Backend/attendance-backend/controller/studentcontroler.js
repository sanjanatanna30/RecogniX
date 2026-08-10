// backend/controllers/studentController.js
const Student = require("../models/student");

exports.getAllStudents = async (req, res) => {
  const students = await Student.find();
  res.json(students);
};

exports.markAttendance = async (req, res) => {
  const updates = req.body; // Array of {rollNumber, present}

  for (let update of updates) {
    await Student.findOneAndUpdate(
      { rollNumber: update.rollNumber },
      { present: update.present }
    );
  }

  res.json({ message: "Attendance Updated" });
};
