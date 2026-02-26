import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import "./BulkUpload.css";

interface Template {
  id: string;
  name: string;
}

export default function BulkUpload() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);

  if (user?.role === "admin") {
    return <Navigate to="/dashboard" />;
  }

  const [templateId, setTemplateId] = useState("");
  const [fields, setFields] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/templates").then((res) => setTemplates(res.data.templates));
  }, []);

  useEffect(() => {
    if (templateId) {
      api
        .get(`/templates/${templateId}`)
        .then((res) => {
          const dynamicFields = res.data.fields.filter(
            (f: any) =>
              !f.is_static &&
              f.field_type !== "certificate_id" &&
              f.field_type !== "verification_link",
          );
          setFields(dynamicFields);
        })
        .catch(() => setFields([]));
    } else {
      setFields([]);
    }
  }, [templateId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setProgress(null);

    if (!templateId || !file) {
      setError("Select a template and upload a CSV file.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("template_id", templateId);
      formData.append("csv", file);

      const token = localStorage.getItem("token");

      const response = await fetch("/api/certificates/bulk", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      if (!response.body) throw new Error("Readable stream not available.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim().startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "progress") {
            setProgress({ current: data.current, total: data.total });
          } else if (data.type === "done") {
            setResult(data);
            setProgress(null);
          } else if (data.type === "error") {
            setError(data.error);
            setProgress(null);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Bulk generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    if (fields.length === 0) return;

    const headers = fields.map((f) => f.label).join(",");
    const sampleRow = fields
      .map((f) =>
        f.label === "Completion Date" ? "2026-02-25" : `Sample ${f.label}`,
      )
      .join(",");

    const csvContent = `${headers}\n${sampleRow}`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${templates.find((t) => t.id === templateId)?.name || "template"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Bulk Certificate Upload</h1>
        <p>Upload a CSV file to generate certificates in bulk</p>
      </div>

      {/* Form Section */}
      <div className="card">
        <form onSubmit={handleUpload}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-container">
            <div className="input-group">
              <label>Template</label>
              <select
                className="input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {/* CSV Section */}
            
              <div className="csv-header">
                <h3>CSV Format</h3>

                {templateId && fields.length > 0 && (
                  <button
                    type="button"
                    onClick={downloadSampleCSV}
                    className="btn btn-secondary download-sample-btn"
                  >
                    Download Sample CSV
                  </button>
                )}
              </div>

              <p className="csv-description">
                {templateId ? (
                  fields.length > 0 ? (
                    <>
                      Your CSV should have these columns:
                      <strong> {fields.map((f) => f.label).join(", ")}</strong>
                    </>
                  ) : (
                    "No dynamic fields found in this template."
                  )
                ) : (
                  "Please select a template to see required CSV columns."
                )}
              </p>

              {templateId && fields.length > 0 && (
                <pre className="csv-preview">
                  {`${fields.map((f) => f.label).join(",")}\n${fields.map((f) => (f.label === "Completion Date" ? "2026-02-25" : `Sample ${f.label}`)).join(",")}`}
                </pre>
              )}
            
            <div
              className="upload-area"
              onClick={() => fileRef.current?.click()}
            >
              <p>{file ? file.name : "Click to select CSV file"}</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {progress && (
              <div className="progress-wrapper">
                <div className="progress-header">
                  <span>
                    Generating {progress.current} of {progress.total}
                  </span>
                  <span className="progress-percent">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-green btn-lg full-width"
              disabled={loading}
            >
              {loading ? "Processing..." : "Generate Bulk Certificates"}
            </button>
          </div>
        </form>
      </div>
      {/* Download Section */}
      {result && (
        <div className="card result-card">
          <h3 className="result-message">{result.message}</h3>

          <a
            href={result.zip_download_url}
            download
            className="btn btn-download"
          >
            Download ZIP
          </a>

          {result.certificates && (
            <div className="table-container result-table-container">
              <table>
                <thead>
                  <tr>
                    <th className="head-table-container">Student</th>
                    <th className="head-table-container">Course</th>
                    <th className="head-table-container">Verification Code</th>
                  </tr>
                </thead>
                <tbody>
                  {result.certificates.map((cert: any) => (
                    <tr key={cert.id}>
                      <td>{cert.student_name}</td>
                      <td>{cert.course_name}</td>
                      <td className="verification-code">
                        {cert.verification_code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
