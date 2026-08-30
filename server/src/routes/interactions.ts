import express from 'express';
import rateLimit from 'express-rate-limit';
import { createInteractions, getInteractions, uploadAudio } from '../controllers/interactionsController.js';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/webm' || file.mimetype === 'audio/mp3' || file.mimetype === 'audio/mpeg') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only WebM and MP3 are allowed.'));
    }
  }
});


const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 sync requests per windowMs
  message: 'Too many synchronization attempts, please try again later' as any,
  standardHeaders: true,
  keyGenerator: (req: any) => (req.headers['cf-connecting-ip'] || req.ip) as string,
  legacyHeaders: false,
});


router.post('/', syncLimiter, authenticateToken, createInteractions);
router.get('/', authenticateToken, getInteractions);

export default router;
// Audio Upload Endpoint
router.post('/upload-audio', authenticateToken, upload.single('audio'), uploadAudio);
// Photo Upload Endpoint
const uploadPhotoMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});
router.post('/upload-photo', authenticateToken, uploadPhotoMulter.single('photo'), uploadAudio);
