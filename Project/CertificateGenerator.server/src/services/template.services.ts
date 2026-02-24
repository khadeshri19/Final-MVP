import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { generateShortCode } from '../utils/string.utils';
import * as templateRepo from '../repository/template.repository';
import { Template, TemplateField } from '../models/template.models';

export const uploadTemplate = async (userId: string, name: string, file: Express.Multer.File): Promise<Template> => {
    const imagePath = `/uploads/${file.filename}`;
    return await templateRepo.createTemplate(userId, name, imagePath);
};

export const getTemplates = async (userId: string): Promise<Template[]> => {
    return await templateRepo.getTemplatesByUserId(userId);
};

export const getTemplateDetails = async (id: string, userId: string) => {
    const template = await templateRepo.getTemplateById(id, userId);
    if (!template) return null;

    const fields = await templateRepo.getTemplateFields(id);
    return { template, fields };
};

export const saveTemplateFields = async (id: string, userId: string, fields: any[]) => {
    const template = await templateRepo.getTemplateById(id, userId);
    if (!template) throw new Error('Template not found');

    const insertedFields = [];
    for (const field of fields) {
        const newField: TemplateField = {
            template_id: id,
            field_type: field.field_type,
            label: field.label || field.field_type,
            position_x: field.position_x ?? 0,
            position_y: field.position_y ?? 0,
            font_size: field.font_size || 16,
            font_color: field.font_color || '#000000',
            font_family: field.font_family || 'Helvetica',
            is_bold: field.is_bold || false,
            is_italic: field.is_italic || false,
            text_align: field.text_align || 'left',
            default_value: field.default_value
        };
        insertedFields.push(await templateRepo.addTemplateField(newField));
    }
    return insertedFields;
};

export const updateTemplateFields = async (id: string, userId: string, fields: any[], width: number, height: number) => {
    const template = await templateRepo.getTemplateById(id, userId);
    if (!template) throw new Error('Template not found');

    const previewCertificateId = `CERT-${generateShortCode()}`;
    const previewVerificationCode = generateShortCode();

    await templateRepo.updateTemplatePreview(id, previewCertificateId, previewVerificationCode, width, height);

    await templateRepo.deleteTemplateFields(id);

    const insertedFields = [];
    for (const field of fields) {
        const newField: TemplateField = {
            template_id: id,
            field_type: field.field_type,
            label: field.label || field.field_type,
            position_x: field.position_x ?? 0,
            position_y: field.position_y ?? 0,
            font_size: field.font_size || 16,
            font_color: field.font_color || '#000000',
            font_family: field.font_family || 'Helvetica',
            is_bold: field.is_bold || false,
            is_italic: field.is_italic || false,
            text_align: field.text_align || 'left',
            default_value: field.default_value
        };
        insertedFields.push(await templateRepo.addTemplateField(newField));
    }

    return {
        fields: insertedFields,
        preview_certificate_id: previewCertificateId,
        preview_verification_code: previewVerificationCode,
    };
};

export const deleteTemplate = async (id: string, userId: string) => {
    const template = await templateRepo.getTemplateById(id, userId);
    if (!template) throw new Error('Template not found');

    // Delete PDFs
    const certs = await templateRepo.getCertificatesByTemplateId(id);
    for (const cert of certs) {
        if (cert.pdf_path) {
            // Normalize path for Windows: strip leading slash/backslash
            const normalizedPdfPath = cert.pdf_path.replace(/^[/\\]+/, "");
            const pdfFullPath = path.join(__dirname, '..', '..', normalizedPdfPath);
            if (fs.existsSync(pdfFullPath)) {
                fs.unlinkSync(pdfFullPath);
            }
        }
    }

    await templateRepo.deleteCertificatesByTemplateId(id);
    await templateRepo.deleteTemplate(id);

    // Delete Image
    if (template.template_image_path) {
        // Normalize path for Windows: strip leading slash/backslash
        const normalizedImagePath = template.template_image_path.replace(/^[/\\]+/, "");
        const imagePath = path.join(__dirname, '..', '..', normalizedImagePath);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
};
