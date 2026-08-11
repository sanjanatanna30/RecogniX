const express = require("express");
const router = express.Router();
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ========== Multer Setup ==========
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Student Database dictionary
const STUDENT_DATABASE = {
  "jay": { rollNo: "SEC-101", department: "Computer Engineering", email: "jay@college.edu" },
  "krinsh": { rollNo: "SEC-102", department: "Computer Engineering", email: "krinsh@college.edu" },
  "kris": { rollNo: "SEC-103", department: "Information Technology", email: "kris@college.edu" },
  "milan": { rollNo: "SEC-104", department: "Computer Engineering", email: "milan@college.edu" },
  "parimal": { rollNo: "SEC-105", department: "Information Technology", email: "parimal@college.edu" },
  "raju": { rollNo: "SEC-106", department: "Electronics Engineering", email: "raju@college.edu" },
  "rishi": { rollNo: "SEC-107", department: "Computer Engineering", email: "rishi@college.edu" },
  "vishal": { rollNo: "SEC-108", department: "Electronics Engineering", email: "vishal@college.edu" }
};

// Determine Python Executable Path
function getPythonExecutable() {
  const venvPythonWin = path.join(__dirname, "..", "..", "..", ".venv", "Scripts", "python.exe");
  const venvPythonUnix = path.join(__dirname, "..", "..", "..", ".venv", "bin", "python");

  if (fs.existsSync(venvPythonWin)) {
    return venvPythonWin;
  } else if (fs.existsSync(venvPythonUnix)) {
    return venvPythonUnix;
  }
  return "python"; // Fallback to system python
}

// ========== Route: POST /api/students/mark ==========
router.post("/mark", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded." });
  }

  const imagePath = req.file.path;
  const scriptPath = path.join(__dirname, "..", "..", "..", "face_model_python", "recognise_face.py");
  const pythonPath = getPythonExecutable();

  console.log(`Executing face recognition using Python: ${pythonPath}`);
  console.log(`Target image: ${imagePath}`);

  const python = spawn(pythonPath, [scriptPath, imagePath]);

  let stdoutData = "";
  let stderrData = "";

  python.stdout.on("data", (data) => {
    stdoutData += data.toString();
  });

  python.stderr.on("data", (data) => {
    stderrData += data.toString();
    console.warn("Python stderr:", data.toString().trim());
  });

  python.on("close", (code) => {
    console.log(`Python process exited with code ${code}`);

    if (code !== 0) {
      console.error("Python stderr log:", stderrData);
      return res.status(500).json({ 
        success: false, 
        error: "Face recognition processing failed.",
        details: stderrData 
      });
    }

    try {
      const parsedResult = JSON.parse(stdoutData.trim());

      if (!parsedResult.success) {
        return res.status(400).json({
          success: false,
          error: parsedResult.error || "Recognition failed"
        });
      }

      const rawDetected = parsedResult.detected || [];
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date().toISOString().split('T')[0];

      // Enrich detected student data
      const studentRecords = rawDetected.map((name) => {
        const key = name.toLowerCase().trim();
        const info = STUDENT_DATABASE[key] || {
          rollNo: `SEC-${Math.floor(100 + Math.random() * 900)}`,
          department: "General",
          email: `${key}@college.edu`
        };

        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          rollNo: info.rollNo,
          department: info.department,
          email: info.email,
          status: "Present",
          time: timestamp,
          date: dateStr
        };
      });

      return res.json({
        success: true,
        detectedCount: studentRecords.length,
        unknownCount: parsedResult.unknown_count || 0,
        totalFaces: parsedResult.total_faces || 0,
        students: studentRecords,
        rawResult: parsedResult
      });

    } catch (err) {
      console.error("JSON Parsing Error:", err, "Raw stdout:", stdoutData);
      return res.status(500).json({
        success: false,
        error: "Failed to parse face recognition output.",
        rawOutput: stdoutData
      });
    }
  });
});

// GET /api/students - Get registered student directory
router.get("/", (req, res) => {
  const students = Object.entries(STUDENT_DATABASE).map(([key, info]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    rollNo: info.rollNo,
    department: info.department,
    email: info.email
  }));
  res.json({ success: true, students });
});

module.exports = router;
