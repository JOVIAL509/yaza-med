import { Router } from 'express';
import { Content, Subject, Topic, Question, Attempt, Bookmark, Progress, User } from '../models/index.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { listStudyNotes, createStudyNoteLink } from '../services/studyNotes.js';
const router = Router();
router.get('/notes', authenticate, async (req, res, next) => {
  try { res.json(await listStudyNotes({ subject: req.query.subject, query: req.query.q })); } catch (e) { next(e); }
});
router.get('/notes/link', authenticate, async (req, res, next) => {
  try {
    const { path, download } = req.query;
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..')) {
      return res.status(400).json({ message: 'Choose a valid note file.' });
    }
    res.json({ url: await createStudyNoteLink(path, download === '1') });
  } catch (e) { next(e); }
});
router.get('/subjects', async (_req, res, next) => { try { res.json(await Subject.find({ published: true }).sort({ order: 1 }).lean()); } catch (e) { next(e); } });
router.get('/content', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1), limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const filter = { status: 'published' };
    if (['note', 'quick-lesson', 'high-yield'].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.subject) {
      const subject = await Subject.findOne({ $or: [{ _id: req.query.subject.match(/^[0-9a-f]{24}$/i) ? req.query.subject : null }, { slug: String(req.query.subject).toLowerCase() }, { title: new RegExp(`^${String(req.query.subject).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] }).select('_id').lean();
      if (!subject) return res.json({ items: [], page, pages: 0, total: 0 });
      filter.subject = subject._id;
    }
    if (req.query.topic) filter.topic = req.query.topic;
    if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 100) };
    const [items, total] = await Promise.all([Content.find(filter).select('-body').populate('subject', 'title slug').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Content.countDocuments(filter)]);
    res.json({ items, page, pages: Math.ceil(total / limit), total });
  } catch (e) { next(e); }
});
router.get('/content/:id', async (req, res, next) => {
  try {
    const item = await Content.findOne({ _id: req.params.id, status: 'published' }).populate('subject', 'title slug').populate('topic', 'title').lean();
    if (!item) return res.status(404).json({ message: 'Learning resource not found.' });
    res.json(item);
  } catch (e) { next(e); }
});
router.get('/questions', authenticate, async (req, res, next) => { try { const filter = { status: 'published' }; if (req.query.subject) { const subject = await Subject.findOne({ $or: [{ _id: /^[0-9a-f]{24}$/i.test(req.query.subject) ? req.query.subject : null }, { slug: String(req.query.subject).toLowerCase() }] }).select('_id').lean(); if (!subject) return res.json([]); filter.subject = subject._id; } if (req.query.topic) filter.topic = req.query.topic; const rows = await Question.find(filter).select('-answer -explanation').limit(Math.min(30, Number(req.query.limit) || 10)).lean(); res.json(rows); } catch (e) { next(e); } });
router.post('/attempts', authenticate, async (req, res, next) => {
  try {
    const answers = Array.isArray(req.body?.responses) ? req.body.responses.slice(0, 100) : [];
    if (!answers.length) return res.status(400).json({ message: 'Submit at least one answer.' });
    const ids = answers.map(x => x.question), questions = await Question.find({ _id: { $in: ids }, status: 'published' }).lean();
    const byId = new Map(questions.map(q => [String(q._id), q]));
    const responses = answers.filter(a => byId.has(String(a.question))).map(a => ({ question: a.question, answer: Number(a.answer), correct: Number(a.answer) === byId.get(String(a.question)).answer }));
    if (!responses.length) return res.status(400).json({ message: 'No valid published questions were submitted.' });
    const score = responses.filter(a => a.correct).length;
    const attempt = await Attempt.create({ student: req.user.id, responses, score, total: responses.length, mode: req.body.mode === 'exam' ? 'exam' : 'practice' });
    const explanations = responses.map(r => ({ question: r.question, correct: r.correct, answer: byId.get(String(r.question)).answer, explanation: byId.get(String(r.question)).explanation }));
    res.status(201).json({ attempt, explanations, percentage: Math.round(score / responses.length * 100) });
  } catch (e) { next(e); }
});
router.get('/progress', authenticate, async (req, res, next) => { try { const [attempts, bookmarks, progress] = await Promise.all([Attempt.find({ student: req.user.id }).sort({ createdAt: -1 }).limit(10).lean(), Bookmark.find({ student: req.user.id }).populate('material').lean(), Progress.find({ student: req.user.id }).lean()]); res.json({ attempts, bookmarks, progress }); } catch (e) { next(e); } });
router.get('/bookmarks', authenticate, async (req, res, next) => { try { res.json(await Bookmark.find({ student: req.user.id }).populate('material').sort({ createdAt: -1 }).lean()); } catch (e) { next(e); } });
router.post('/bookmarks', authenticate, async (req, res, next) => { try { const { material, materialType } = req.body || {}; if (!material || !['note', 'quick-lesson', 'high-yield'].includes(materialType)) return res.status(400).json({ message: 'Choose a valid learning resource.' }); const item = await Content.findOne({ _id: material, type: materialType, status: 'published' }); if (!item) return res.status(404).json({ message: 'Learning resource not found.' }); const bookmark = await Bookmark.findOneAndUpdate({ student: req.user.id, material, materialType }, {}, { upsert: true, new: true, setDefaultsOnInsert: true }); res.status(201).json(bookmark); } catch (e) { next(e); } });
router.delete('/bookmarks/:id', authenticate, async (req, res, next) => { try { await Bookmark.deleteOne({ _id: req.params.id, student: req.user.id }); res.status(204).end(); } catch (e) { next(e); } });
router.get('/admin/content', authenticate, adminOnly, async (req, res, next) => { try { const filter = req.query.status ? { status: req.query.status } : {}; res.json(await Content.find(filter).populate('subject', 'title').sort({ updatedAt: -1 }).lean()); } catch (e) { next(e); } });
router.post('/admin/content', authenticate, adminOnly, async (req, res, next) => { try { const item = await Content.create({ ...req.body, author: req.user.id }); res.status(201).json(item); } catch (e) { next(e); } });
router.patch('/admin/content/:id', authenticate, adminOnly, async (req, res, next) => { try { const item = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Content not found.' }); res.json(item); } catch (e) { next(e); } });
router.delete('/admin/content/:id', authenticate, adminOnly, async (req, res, next) => { try { await Content.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (e) { next(e); } });
router.get('/admin/topics', authenticate, adminOnly, async (req, res, next) => { try { const filter = req.query.subject ? { subject: req.query.subject } : {}; res.json(await Topic.find(filter).populate('subject', 'title').sort({ order: 1 }).lean()); } catch (e) { next(e); } });
router.post('/admin/topics', authenticate, adminOnly, async (req, res, next) => { try { const { title, subject, parent, order } = req.body || {}; if (!title?.trim() || !subject) return res.status(400).json({ message: 'A topic title and subject are required.' }); const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); const nextOrder = await Topic.countDocuments({ subject, parent: parent || null }); const courseOrder = Number.isFinite(Number(order)) ? Number(order) : nextOrder; res.status(201).json(await Topic.create({ title: title.trim(), slug, subject, parent: parent || null, order: courseOrder })); } catch (e) { next(e); } });
router.get('/admin/questions', authenticate, adminOnly, async (req, res, next) => { try { const filter = req.query.status ? { status: req.query.status } : {}; res.json(await Question.find(filter).populate('subject', 'title').populate('topic', 'title').sort({ updatedAt: -1 }).limit(200).lean()); } catch (e) { next(e); } });
router.post('/admin/questions', authenticate, adminOnly, async (req, res, next) => { try { const { prompt, options, answer, explanation, subject } = req.body || {}; if (!prompt?.trim() || !Array.isArray(options) || options.length !== 5 || options.some(x => !String(x).trim()) || !Number.isInteger(Number(answer)) || Number(answer) < 0 || Number(answer) > 4 || !explanation?.trim() || !subject) return res.status(400).json({ message: 'Add a question, all five options, the correct option, explanation and subject.' }); res.status(201).json(await Question.create({ ...req.body, answer: Number(answer), status: req.body.status === 'published' ? 'published' : 'draft' })); } catch (e) { next(e); } });
router.patch('/admin/questions/:id', authenticate, adminOnly, async (req, res, next) => { try { const item = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Question not found.' }); res.json(item); } catch (e) { next(e); } });
router.delete('/admin/questions/:id', authenticate, adminOnly, async (req, res, next) => { try { await Question.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (e) { next(e); } });
router.get('/admin/users', authenticate, adminOnly, async (_req, res, next) => { try { res.json(await User.find().select('name email role active createdAt').sort({ createdAt: -1 }).limit(500).lean()); } catch (e) { next(e); } });
router.patch('/admin/users/:id', authenticate, adminOnly, async (req, res, next) => { try { const active = Boolean(req.body?.active); if (String(req.user.id) === req.params.id && !active) return res.status(400).json({ message: 'You cannot deactivate your own account.' }); const user = await User.findByIdAndUpdate(req.params.id, { active }, { new: true }).select('name email role active createdAt'); if (!user) return res.status(404).json({ message: 'Student not found.' }); res.json(user); } catch (e) { next(e); } });
router.get('/admin/analytics', authenticate, adminOnly, async (_req, res, next) => {
  try {
    const [users, students, contents, questions, attempts, scores] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student', active: true }),
      Content.countDocuments({ status: 'published' }),
      Question.countDocuments({ status: 'published' }),
      Attempt.countDocuments(),
      Attempt.aggregate([
        { $group: { _id: null, average: { $avg: { $multiply: [{ $divide: ['$score', '$total'] }, 100] } } } }
      ])
    ]);
    res.json({ users, students, publishedResources: contents, publishedQuestions: questions, quizAttempts: attempts, averageScore: Math.round(scores[0]?.average || 0) });
  } catch (e) { next(e); }
});
export default router;
