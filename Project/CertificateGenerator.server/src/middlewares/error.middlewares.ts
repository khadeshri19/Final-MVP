import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../utils/error.utils';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);

    // Handle Multer-specific errors (file upload issues)
    if (err instanceof multer.MulterError) {
        const messages: Record<string, string> = {
            LIMIT_FILE_SIZE: 'File is too large. Maximum size is 10MB.',
            LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
            LIMIT_FILE_COUNT: 'Too many files.',
        };
        return res.status(400).json({
            status: 'error',
            message: messages[err.code] || `Upload error: ${err.message}`,
        });
    }

    // Handle file filter errors (wrong file type)
    if (err.message && (err.message.includes('Only PNG') || err.message.includes('Only'))) {
        return res.status(400).json({
            status: 'error',
            message: err.message,
        });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }

    return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
    });
};
