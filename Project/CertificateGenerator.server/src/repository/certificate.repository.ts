import pool from '../script/pool.script';
import { Certificate } from '../models/certificate.models';

export const createCertificate = async (
    templateId: string,
    userId: string,
    studentName: string,
    courseName: string,
    completionDate: string,
    verificationCode: string,
    customData: any = {}
): Promise<Certificate> => {
    const result = await pool.query(
        `INSERT INTO certificates (template_id, user_id, student_name, course_name, completion_date, verification_code, custom_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [templateId, userId, studentName || null, courseName || null, completionDate || null, verificationCode, JSON.stringify(customData)]
    );
    return result.rows[0];
};

export const updateCertificatePdfPath = async (id: string, pdfPath: string): Promise<void> => {
    await pool.query('UPDATE certificates SET pdf_path = $1 WHERE id = $2', [pdfPath, id]);
};

export const getCertificatesByUserId = async (userId: string): Promise<Certificate[]> => {
    const result = await pool.query(
        'SELECT * FROM certificates WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );
    return result.rows;
};

export const getCertificateById = async (id: string): Promise<Certificate | null> => {
    const result = await pool.query('SELECT * FROM certificates WHERE id = $1', [id]);
    return result.rows[0] || null;
};
