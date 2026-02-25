import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import './CertificateGenerator.css';

interface Template {
    id: string;
    name: string;
}

export default function CertificateGeneratorPage() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [templateId, setTemplateId] = useState('');
    const [fields, setFields] = useState<any[]>([]);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

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

                // Initialize form data with default values or empty strings
                const initial: Record<string, string> = {};
                dynamicFields.forEach((f: any) => {
                    initial[f.field_type] = f.default_value || '';
                });
                setFormData(initial);
            }).catch(() => setFields([]));
        } else {
            setFields([]);
            setFormData({});
        }
    }, [templateId]);

    const handleInputChange = (fieldType: string, value: string) => {
        setFormData(prev => ({ ...prev, [fieldType]: value }));
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);

        if (!templateId) {
            setError('Please select a template.');
            return;
        }

        // Check if all required fields are filled (basic check)
        const missingFields = fields.filter(f => !formData[f.field_type]);
        if (missingFields.length > 0) {
            setError(`Please fill in all fields: ${missingFields.map(f => f.label).join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            // We'll send the whole formData object.
            // Backend needs to handle this (Mapping standard fields and keeping extras in customData)
            const res = await api.post('/certificates/generate', {
                template_id: templateId,
                ...formData
            });
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate certificate.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!result?.certificate?.id) return;
        try {
            // Download via the dedicated download endpoint
            const response = await api.get(`/certificates/download/${result.certificate.id}`, {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `certificate_${result.certificate.student_name}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            // Fallback to direct URL
            window.open(result.download_url, '_blank');
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>Generate Certificate</h1>
                <p>Fill in student details to generate a single certificate</p>
            </div>

            <div className="card">
                <form onSubmit={handleGenerate}>
                    {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}

                    <div className="generator-form">
                        <div className="input-group full-width">
                            <label>Template</label>
                            <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                                <option value="">Select a template...</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {fields.map(field => (
                            <div key={field.id} className="input-group">
                                <label>{field.label}</label>
                                {field.field_type === 'completion_date' ? (
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData[field.field_type] || ''}
                                        onChange={(e) => handleInputChange(field.field_type, e.target.value)}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={`Enter ${field.label.toLowerCase()}`}
                                        value={formData[field.field_type] || ''}
                                        onChange={(e) => handleInputChange(field.field_type, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <button type="submit" className="btn btn-green btn-lg" disabled={loading} style={{ width: '100%', marginTop: fields.length > 0 ? '20px' : '0' }}>
                        {loading ? <span className="spinner" /> : 'Generate Certificate'}
                    </button>
                </form>
            </div>

            {result && (
                <div className="card generator-result">
                    <h3>Certificate Generated Successfully!</h3>
                    <div className="cert-details">
                        <p><strong>Student:</strong> {result.certificate.student_name}</p>
                        <p><strong>Course:</strong> {result.certificate.course_name}</p>
                        <p><strong>Certificate ID:</strong> CERT-{result.certificate.id.split('-')[0].toUpperCase()}</p>
                        <p><strong>Verification Code:</strong> {result.certificate.verification_code}</p>
                        <p><strong>Completion Date:</strong> {new Date(result.certificate.completion_date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                        })}</p>
                    </div>
                    <div className="btn-group">
                        <button onClick={handleDownload} className="btn btn-download">
                            Download PDF
                        </button>
                        <a
                            href={`/verify/${result.certificate.verification_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                        >
                            Verification Link
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
