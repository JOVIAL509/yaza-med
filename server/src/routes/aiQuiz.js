import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { AiQuizCache } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { generateQuiz, gradeQuiz } from '../services/aiQuiz.js';

const router = Router();
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const allowedExtensions = new Set([
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.odt', '.odp', '.ods', '.odg', '.rtf', '.epub',
  '.txt', '.md', '.csv', '.html', '.htm', '.tex', '.json', '.xml', '.png', '.jpg', '.jpeg', '.webp', '.gif'
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0, parts: 1 },
  fileFilter(_req, file, callback) {
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      callback(new Error('Use PDF, Word, PowerPoint, Excel, OpenDocument, EPUB, RTF, text, CSV, JSON, XML, HTML, or an image file.'));
      return;
    }
    callback(null, true);
  }
});
const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => String(req.user._id),
  message: { message: 'Too many quiz-generation requests. Please try again later.' }
});

function receiveHandout(req, res, next) {
  upload.single('file')(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        message: tooLarge ? 'Handouts must be 15 MB or smaller.' : 'Upload one handout at a time.'
      });
    }
    return res.status(415).json({ message: error.message });
  });
}

router.post('/ai-quiz/generate', authenticate, generationLimiter, receiveHandout, async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a handout to create a quiz.' });
  try {
    const quiz = await generateQuiz(req.file);
    const quizToken = jwt.sign(
      { quizId: quiz.quizId, scope: 'ai-quiz' },
      process.env.JWT_SECRET,
      { subject: String(req.user._id), expiresIn: '4h' }
    );
    const { quizId, ...publicQuiz } = quiz;
    res.json({ ...publicQuiz, quizToken, fileName: req.file.originalname });
  } catch (error) {
    next(error);
  }
});

router.post('/ai-quiz/submit', authenticate, async (req, res, next) => {
  try {
    const { quizToken, answers, shortAnswers } = req.body || {};
    if (typeof quizToken !== 'string') return res.status(400).json({ message: 'Your quiz session is missing. Generate the quiz again.' });
    let session;
    try {
      session = jwt.verify(quizToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Your quiz session expired. Generate the quiz again.' });
    }
    if (session.scope !== 'ai-quiz' || session.sub !== String(req.user._id) || !session.quizId) {
      return res.status(403).json({ message: 'This quiz session does not belong to your account.' });
    }
    const quiz = await AiQuizCache.findById(session.quizId).lean();
    if (!quiz) return res.status(404).json({ message: 'This quiz is no longer available. Generate it again.' });
    res.json(gradeQuiz(quiz, answers, shortAnswers));
  } catch (error) {
    next(error);
  }
});

export default router;
