import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  Search,
  Download,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  FileText,
  X
} from "lucide-react";
import "./App.css";

const API_BASE_URL = "http://localhost:5000";

const AttendanceDashboard = () => {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [serverStatus, setServerStatus] = useState("checking");
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState(null);
  const [unknownCount, setUnknownCount] = useState(0);
  const [totalFaces, setTotalFaces] = useState(0);
  const fileInputRef = useRef(null);

  // Ping backend server to verify connection status
  const checkServerStatus = async () => {
    setServerStatus("checking");
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        setServerStatus("online");
      } else {
        setServerStatus("offline");
      }
    } catch {
      setServerStatus("offline");
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleImageChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAlert({ type: "error", message: "Please select a valid image file." });
      return;
    }
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAlert(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleImageChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = () => {
    setImage(null);
    setPreviewUrl(null);
    setAlert(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!image) {
      setAlert({ type: "error", message: "Please select or drop an image first." });
      return;
    }

    setLoading(true);
    setAlert(null);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch(`${API_BASE_URL}/api/students/mark`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to process image.");
      }

      setUnknownCount(data.unknownCount || 0);
      setTotalFaces(data.totalFaces || 0);

      if (data.students && data.students.length > 0) {
        // Merge with existing students avoiding duplicates
        setStudents((prev) => {
          const existingRolls = new Set(prev.map((s) => s.rollNo));
          const newUnique = data.students.filter((s) => !existingRolls.has(s.rollNo));
          return [...newUnique, ...prev];
        });

        const names = data.students.map((s) => s.name).join(", ");
        setAlert({
          type: "success",
          message: `Recognized ${data.detectedCount} student(s): ${names}.${
            data.unknownCount ? ` (${data.unknownCount} unknown face(s) detected)` : ""
          }`
        });
      } else {
        setAlert({
          type: "error",
          message: data.unknownCount > 0 
            ? `Detected ${data.unknownCount} face(s), but no registered student matches were found.` 
            : "No faces detected in the uploaded photo."
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setAlert({
        type: "error",
        message: err.message || "Failed to connect to recognition backend server."
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (students.length === 0) return;
    const headers = "Name,Roll No,Department,Status,Time,Date\n";
    const rows = students
      .map((s) => `"${s.name}","${s.rollNo}","${s.department}","${s.status}","${s.time}","${s.date}"`)
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRecognized = students.length;
  const attendanceRate = totalFaces > 0 ? Math.round((totalRecognized / Math.max(totalFaces, totalRecognized)) * 100) : 100;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-title-group">
          <div className="header-icon-box">
            <Sparkles size={26} color="#ffffff" />
          </div>
          <div>
            <h1 className="header-title">Smart Attendance System</h1>
            <p className="header-subtitle">AI Face Recognition & Attendance Marking Dashboard</p>
          </div>
        </div>

        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className={`status-badge ${serverStatus === "online" ? "online" : "offline"}`}>
            <span className="pulse-dot"></span>
            Backend API: {serverStatus === "online" ? "Online" : serverStatus === "checking" ? "Checking..." : "Offline"}
          </div>
          <button className="btn-secondary" onClick={checkServerStatus} title="Refresh connection">
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
            <Users size={24} />
          </div>
          <div>
            <h3 className="stat-value">{totalRecognized}</h3>
            <p className="stat-label">Students Present</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
            <UserCheck size={24} />
          </div>
          <div>
            <h3 className="stat-value">{totalFaces}</h3>
            <p className="stat-label">Total Faces Detected</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
            <UserX size={24} />
          </div>
          <div>
            <h3 className="stat-value">{unknownCount}</h3>
            <p className="stat-label">Unknown Faces</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="stat-value">{attendanceRate}%</h3>
            <p className="stat-label">Recognition Accuracy</p>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`alert-banner ${alert.type}`}>
          {alert.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="main-content-grid">
        {/* Upload Panel */}
        <div className="panel-card">
          <h2 className="panel-title">
            <Camera size={20} color="#818cf8" />
            Upload Class / Group Photo
          </h2>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {!previewUrl ? (
            <div
              className="dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <UploadCloud size={44} color="#818cf8" style={{ marginBottom: "12px" }} />
              <p style={{ fontWeight: 600, margin: "0 0 6px 0", color: "#f1f5f9" }}>
                Click to browse or drag & drop photo here
              </p>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>
                Supports JPG, JPEG, PNG high-res photos
              </p>
            </div>
          ) : (
            <div className="preview-container">
              <img src={previewUrl} alt="Class Preview" className="preview-img" />
              <button
                onClick={clearSelection}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Remove photo"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={loading || !image}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="spin-animation" style={{ animation: "spin 1s linear infinite" }} />
                Recognizing Faces...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Run AI Recognition & Mark Attendance
              </>
            )}
          </button>
        </div>

        {/* Attendance List Table */}
        <div className="panel-card">
          <div className="table-header-bar">
            <h2 className="panel-title" style={{ margin: 0 }}>
              <FileText size={20} color="#818cf8" />
              Attendance Directory ({filteredStudents.length})
            </h2>

            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn-secondary" onClick={exportToCSV} disabled={students.length === 0}>
                <Download size={14} /> Export CSV
              </button>
              {students.length > 0 && (
                <button className="btn-secondary" onClick={() => setStudents([])}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by student name, roll number, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Time Marked</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <Users size={40} className="empty-state-icon" />
                        <p style={{ fontWeight: 600, margin: "4px 0" }}>No Attendance Marked Yet</p>
                        <p style={{ fontSize: "0.8rem", margin: 0 }}>
                          Upload a class photo on the left panel to run face recognition and mark present students.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{student.name}</td>
                      <td>
                        <span className="badge-roll">{student.rollNo}</span>
                      </td>
                      <td style={{ color: "#94a3b8" }}>{student.department}</td>
                      <td>
                        <span className="badge-present">
                          <CheckCircle2 size={12} /> Present
                        </span>
                      </td>
                      <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{student.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
