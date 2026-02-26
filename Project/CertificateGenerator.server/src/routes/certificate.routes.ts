import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middlewares/auth.middlewares';
import * as certificateController from '../controllers/certificate.controllers';

const router = Router();
const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads', 'csv') });

router.post('/generate', authMiddleware, certificateController.generateCertificate);
router.post('/bulk', authMiddleware, upload.single('csv'), certificateController.generateBulkCertificates);
router.get('/', authMiddleware, certificateController.getCertificates);
router.get('/:id', authMiddleware, certificateController.getCertificateDetails);
router.get('/download/:id', authMiddleware, certificateController.downloadCertificate);
router.delete('/:id', authMiddleware, certificateController.deleteCertificate);

export default router;
