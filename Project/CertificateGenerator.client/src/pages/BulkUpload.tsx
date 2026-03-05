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

      if (!response.ok) {
        // Attempt to parse error from response if possible
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
      }

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
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmedLine.slice(6));

            if (data.type === "progress") {
              setProgress({ current: data.current, total: data.total });
            } else if (data.type === "done") {
              setResult(data);
              setProgress(null);
            } else if (data.type === "error") {
              setError(data.error);
              setProgress(null);
            }
          } catch (e) {
            console.error("Failed to parse SSE line:", line);
          }
        }
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError("Server is unreachable. Please check the server is running and try again.");
      } else {
        setError(msg || "Bulk generation failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError("");

    if (!selectedFile || fields.length === 0) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target?.result as string;
      // Remove BOM character if present (common when editing CSV in Windows)
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }
      const firstLine = text.split(/\r?\n/)[0].trim();
      // Strip surrounding quotes and trim whitespace from each header
      const headers = firstLine
        .split(",")
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));

      const expectedHeaders = fields.map((f) => f.label);

      // Check for missing columns (expected but not in CSV)
      const missingHeaders = expectedHeaders.filter(
        (h) => !headers.includes(h),
      );
      // Check for extra columns (in CSV but not expected)
      const extraHeaders = headers.filter(
        (h) => h !== "" && !expectedHeaders.includes(h),
      );

      if (missingHeaders.length > 0 || extraHeaders.length > 0) {
        let errorMsg = "Invalid CSV format.";
        if (missingHeaders.length > 0) {
          errorMsg += ` Missing columns: ${missingHeaders.join(", ")}.`;
        }
        if (extraHeaders.length > 0) {
          errorMsg += ` Unexpected columns: ${extraHeaders.join(", ")}.`;
        }
        errorMsg += ` Expected columns: ${expectedHeaders.join(", ")}`;
        setError(errorMsg);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(selectedFile);
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
      <div className="container-narrow">
        <form className="card" onSubmit={handleUpload}>
          <div className="card-header">
            <h2>Bulk Certificate Upload</h2>
            <p>Upload a CSV file to generate certificates in bulk</p>
          </div>

          <div className="form-container">
            {error && <div className="login-error">{error}</div>}

            <div className="input-group">
              <label>Template</label>
              <select
                className="input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                required
              >
                <option value="">-- Select Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {templateId && (
              <div className="csv-card">
                <div className="csv-header">
                  <h3>CSV Format</h3>
                  <button
                    type="button"
                    className="btn btn-sm download-sample-btn"
                    onClick={downloadSampleCSV}
                    disabled={fields.length === 0}
                  >
                    Download Sample CSV
                  </button>
                </div>
                <p className="csv-description">
                  {fields.length > 0 ? (
                    <>
                      Your CSV should have these columns:{" "}
                      <strong>{fields.map((f) => f.label).join(", ")}</strong>
                    </>
                  ) : (
                    "Loading template fields..."
                  )}
                </p>

                {fields.length > 0 && (
                  <pre className="csv-preview">
                    {`${fields.map((f) => f.label).join(",")}\n${fields.map((f) => (f.label === "Completion Date" ? "2026-02-25" : `Sample ${f.label}`)).join(",")}`}
                  </pre>
                )}
              </div>
            )}

            <div
              className={`upload-area ${error ? "error" : ""}`}
              onClick={() => fileRef.current?.click()}
            >
              <p>{file ? file.name : "Click to select CSV file"}</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileChange}
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
              disabled={loading || !!error || !file}
            >
              {loading ? "Processing..." : "Generate Bulk Certificates"}
            </button>
          </div>
        </form>

        {result && (
          <div className="card result-card">
            <h3 className="result-message">{result.message}</h3>

            <a
              href={result.zip_download_url}
              download
              className="btn btn-download"
              style={{ display: "inline-block", marginBottom: "20px" }}
            >
              Download ZIP
            </a>

            {result.certificates && result.certificates.length > 0 && (
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
    </div>
  );
}
