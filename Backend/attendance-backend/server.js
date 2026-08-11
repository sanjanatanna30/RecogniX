const express = require("express");
const cors = require("cors");
const path = require("path");
const studentRoutes = require("./routes/attendence");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images (preview/debug)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Attendance Backend API is running smoothly." });
});

// Routes
app.use("/api/students", studentRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Attendance Backend Server running on http://localhost:${PORT}`);
});
