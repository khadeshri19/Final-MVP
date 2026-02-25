import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middlewares';
import * as certificateService from '../services/certificate.services';
import fs from 'fs';

export const generateCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { template_id } = req.body;

        if (!template_id) {
            res.status(400).json({ error: 'template_id is required.' });
            return;
        }

        const result = await certificateService.generateSingleCertificate(
            req.user!.id,
            req.user!.role,
            template_id,
            req.body
        );

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Certificate generation error:', error);
        const errorMessage = error.message || '';

        if (errorMessage.includes('Restricted')) {
            res.status(403).json({ error: errorMessage });
        } else if (errorMessage === 'Template not found.') {
            res.status(404).json({ error: errorMessage });
        } else {
            // Include original error message for easier debugging
            res.status(500).json({ error: errorMessage || 'Failed to generate certificate.' });
        }
    }
};

export const generateBulkCertificates = async (req: AuthRequest, res: Response): Promise<void> => {
    // Set SSE headers for streaming progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const { template_id } = req.body;

        if (!template_id || !req.file) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'template_id and CSV file are required.' })}\n\n`);
            res.end();
            return;
        }

        const result = await certificateService.generateBulkCertificates(
            req.user!.id,
            req.user!.role,
            template_id,
            req.file.path,
            (current: number, total: number) => {
                res.write(`data: ${JSON.stringify({ type: 'progress', current, total })}\n\n`);
            }
        );

        // Cleanup CSV
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        // Send final result
        res.write(`data: ${JSON.stringify({ type: 'done', ...result })}\n\n`);
        res.end();
    } catch (error: any) {
        console.error('Bulk generation error:', error);
        // Cleanup CSV if error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        const errorMessage = error.message || 'Failed to generate bulk certificates.';
        res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
        res.end();
    }
};

export const getCertificates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const certificates = await certificateService.getCertificates(req.user!.id);
        res.json({ certificates });
    } catch (error) {
        console.error('Fetch certificates error:', error);
        res.status(500).json({ error: 'Failed to fetch certificates.' });
    }
};

export const getCertificateDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const certificate = await certificateService.getCertificateDetails(id);

        if (!certificate) {
            res.status(404).json({ error: 'Certificate not found.' });
            return;
        }

        res.json({ certificate });
    } catch (error) {
        console.error('Fetch certificate error:', error);
        res.status(500).json({ error: 'Failed to fetch certificate.' });
    }
};

export const downloadCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const result = await certificateService.getCertificatePdfPath(id);

        if (!result) {
            res.status(404).json({ error: 'Certificate PDF not found.' });
            return;
        }

        res.download(result.path, result.filename);
    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({ error: 'Failed to download certificate.' });
    }
};
