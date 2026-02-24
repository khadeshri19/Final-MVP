import pool from '../script/pool.script';
import { Template, TemplateField } from '../models/template.models';

export const createTemplate = async (userId: string, name: string, imagePath: string): Promise<Template> => {
    const result = await pool.query(
        `INSERT INTO templates (user_id, name, template_image_path) 
         VALUES ($1, $2, $3) RETURNING *`,
        [userId, name, imagePath]
    );
    return result.rows[0];
};

export const getTemplatesByUserId = async (userId: string): Promise<Template[]> => {
    const result = await pool.query(
        'SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );
    return result.rows;
};

export const getTemplateById = async (id: string, userId: string): Promise<Template | null> => {
    const result = await pool.query(
        'SELECT * FROM templates WHERE id = $1 AND user_id = $2',
        [id, userId]
    );
    return result.rows[0] || null;
};

export const getTemplateFields = async (templateId: string): Promise<TemplateField[]> => {
    const result = await pool.query(
        'SELECT * FROM template_fields WHERE template_id = $1',
        [templateId]
    );
    return result.rows;
};

export const addTemplateField = async (field: TemplateField): Promise<TemplateField> => {
    const result = await pool.query(
        `INSERT INTO template_fields 
         (template_id, field_type, label, position_x, position_y, font_size, font_color, font_family, is_bold, is_italic, text_align, default_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
            field.template_id,
            field.field_type,
            field.label,
            field.position_x,
            field.position_y,
            field.font_size,
            field.font_color,
            field.font_family,
            field.is_bold,
            field.is_italic,
            field.text_align,
            field.default_value || null,
        ]
    );
    return result.rows[0];
};

export const deleteTemplateFields = async (templateId: string): Promise<void> => {
    await pool.query('DELETE FROM template_fields WHERE template_id = $1', [templateId]);
};

export const updateTemplatePreview = async (
    id: string,
    previewCertId: string,
    previewVerifyCode: string,
    width: number,
    height: number
): Promise<void> => {
    const updateParts = [
        'preview_certificate_id = $1',
        'preview_verification_code = $2'
    ];
    const updateValues: any[] = [previewCertId, previewVerifyCode];
    let paramIndex = 3;

    if (width && height) {
        updateParts.push(`canvas_width = $${paramIndex}`);
        paramIndex++;
        updateParts.push(`canvas_height = $${paramIndex}`);
        paramIndex++;
        updateValues.push(width, height);
    }

    updateValues.push(id);
    await pool.query(
        `UPDATE templates SET ${updateParts.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
    );
};

export const deleteTemplate = async (id: string): Promise<void> => {
    await pool.query('DELETE FROM templates WHERE id = $1', [id]);
};

export const getCertificatesByTemplateId = async (templateId: string): Promise<any[]> => {
    const result = await pool.query(
        'SELECT pdf_path FROM certificates WHERE template_id = $1',
        [templateId]
    );
    return result.rows;
};

export const deleteCertificatesByTemplateId = async (templateId: string): Promise<void> => {
    await pool.query('DELETE FROM certificates WHERE template_id = $1', [templateId]);
};
