import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface Template {
  id: string;
  name: string;
}

export default function BulkUpload() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);

  if (user?.role === 'admin') {
    return <Navigate to="/dashboard" />;
  }
  const [templateId, setTemplateId] = useState('');
  const [fields, setFields] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/templates').then((res) => setTemplates(res.data.templates));
  }, []);

  useEffect(() => {
    if (templateId) {
      api.get(`/templates/${templateId}`).then((res) => {
        const dynamicFields = res.data.fields.filter((f: any) =>
          !f.is_static &&
          f.field_type !== 'certificate_id' &&
          f.field_type !== 'verification_link'
        );
        setFields(dynamicFields);
      }).catch((err) => {
        console.error('Error fetching template fields:', err);
        setFields([]);
      });
    } else {
      setFields([]);
    }
  }, [templateId]);

  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleUpload triggered');
    setError('');
    setResult(null);
    setProgress(null);

    if (!templateId || !file) {
      setError('Select a template and upload a CSV file.');
      console.warn('Missing templateId or file');
      return;
    }

    console.log('Uploading with templateId:', templateId, 'and file:', file.name);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('template_id', templateId);
      formData.append('csv', file);

      const token = localStorage.getItem('token');
      // Relative URL to use the Vite proxy
      const response = await fetch('/api/certificates/bulk', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Fetch response received, status:', response.status);

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          // If not JSON, use generic text
        }
        throw new Error(errorMessage);
      }

      if (!response.body) throw new Error('Readyable stream not available from server.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      console.log('Starting to read stream...');
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('Stream reading complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmedLine.slice(6));
            if (data.type === 'progress') {
              setProgress({ current: data.current, total: data.total });
            } else if (data.type === 'done') {
              setResult(data);
              setProgress(null);
            } else if (data.type === 'error') {
              setError(data.error);
              setProgress(null);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', trimmedLine, e);
          }
        }
      }
    } catch (err: any) {
      console.error('Bulk generation error caught:', err);
      setError(err.message || 'Bulk generation failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    if (fields.length === 0) return;
    const headers = fields.map(f => f.label).join(',');
    const sampleRow = fields.map(f => f.label === 'Completion Date' ? '2026-02-25' : `Sample ${f.label}`).join(',');
    const csvContent = `${headers}\n${sampleRow}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${templates.find(t => t.id === templateId)?.name || 'template'}.csv`;
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

      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: "0.95rem" }}>CSV Format</h3>
          {templateId && fields.length > 0 && (
            <button
              type="button"
              onClick={downloadSampleCSV}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              Download Sample CSV
            </button>
          )}
        </div>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            marginBottom: "12px",
          }}
        >
          {templateId ? (
            fields.length > 0 ? (
              <>
                Your CSV should have these columns:{" "}
                <strong>{fields.map(f => f.label).join(', ')}</strong>
              </>
            ) : (
              "No dynamic fields found in this template. Your CSV just needs to provide rows."
            )
          ) : (
            "Please select a template to see the required CSV columns."
          )}
        </p>
        {templateId && fields.length > 0 && (
          <pre
            style={{
              background: "var(--bg-elevated)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              overflow: "auto",
            }}
          >
            {`${fields.map(f => f.label).join(',')}\n${fields.map(f => f.label === 'Completion Date' ? '2026-02-25' : `Sample ${f.label}`).join(',')}`}
          </pre>
        )}
      </div>

      <div className="card">
        <form onSubmit={handleUpload}>
          {error && (
            <div className="login-error" style={{ marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
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

            <div
              className="upload-area"
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed var(--border-default)",
                borderRadius: "var(--radius-lg)",
                padding: "40px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "2rem" }}></span>
              <p
                style={{
                  color: "var(--text-secondary)",
                  marginTop: "8px",
                  fontSize: "0.9rem",
                }}
              >
                {file ? `${file.name}` : "Click to select CSV file"}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {progress && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Generating {progress.current} of {progress.total} certificates...
                  </span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                      height: '100%',
                      background: 'var(--primary)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-green btn-lg"
              disabled={loading}
              style={{ width: "100%", marginTop: progress ? "10px" : "0" }}
            >
              {loading ? (
                progress ? "Processing..." : "Uploading & Processing..."
              ) : (
                "Generate Bulk Certificates"
              )}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div
          className="card"
          style={{ marginTop: "24px", textAlign: "center" }}
        >
          <h3 style={{ color: "var(--success)", marginBottom: "12px" }}>
            {result.message}
          </h3>
          <a
            href={result.zip_download_url}
            download
            className="btn btn-download"
          >
            Download ZIP
          </a>
          {result.certificates && (
            <div className="table-container" style={{ marginTop: "20px" }}>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Verification Code</th>
                  </tr>
                </thead>
                <tbody>
                  {result.certificates.map((cert: any) => (
                    <tr key={cert.id}>
                      <td>{cert.student_name}</td>
                      <td>{cert.course_name}</td>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                        }}
                      >
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
