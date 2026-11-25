import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 125 },
  firstName: { type: String, trim: true, maxlength: 60 },
  lastName: { type: String, trim: true, maxlength: 60 },
  phone: { type: String, trim: true, maxlength: 30 },
  gender: { type: String, enum: ['female', 'male', 'other', 'prefer-not-to-say', ''], default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Preserve access for accounts created before email verification was added.
  // New public signups are created explicitly with emailVerified: true only after OTP confirmation.
  emailVerified: { type: Boolean, default: undefined, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  active: { type: Boolean, default: true }
}, { timestamps: true }));

export const PendingRegistration = model('PendingRegistration', new Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 60 },
  lastName: { type: String, required: true, trim: true, maxlength: 60 },
  phone: { type: String, trim: true, maxlength: 30 },
  gender: { type: String, enum: ['female', 'male', 'other', 'prefer-not-to-say', ''], default: '' },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  resendAvailableAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  sendCount: { type: Number, default: 1 },
  sendWindowStartedAt: { type: Date, required: true }
}, { timestamps: true }));

export const PendingPasswordReset = model('PendingPasswordReset', new Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  resendAvailableAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  sendCount: { type: Number, default: 1 },
  sendWindowStartedAt: { type: Date, required: true }
}, { timestamps: true }));

const taxonomySchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  published: { type: Boolean, default: true }
}, { timestamps: true });

export const Subject = model('Subject', taxonomySchema);
export const Topic = model('Topic', new Schema({
  ...taxonomySchema.obj,
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Topic', default: null }
}, { timestamps: true }));

const contentSchema = new Schema({
  type: { type: String, enum: ['note', 'quick-lesson', 'high-yield'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  body: { type: String, required: true },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  topic: { type: Schema.Types.ObjectId, ref: 'Topic', index: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  durationMinutes: { type: Number },
  objectives: [String],
  assessment: [{ question: String, answer: String }],
  pdfUrl: String,
  attachments: [String]
}, { timestamps: true });

contentSchema.index({ title: 'text', body: 'text' });

export const Content = model('Content', contentSchema);

export const AiQuizCache = model('AiQuizCache', new Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  model: { type: String, required: true },
  questions: [{
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: Number, required: true },
    explanation: { type: String, required: true }
  }],
  shortAnswerQuestions: [{
    prompt: { type: String, required: true },
    modelAnswer: { type: String, required: true },
    keyPoints: { type: [String], required: true }
  }]
}, { timestamps: true }));

export const Question = model('Question', new Schema({
  prompt: { type: String, required: true },
  options: {
    type: [String],
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length === 5;
      },
      message: 'Question must have exactly 5 options'
    }
  },
  answer: { type: Number, min: 0, max: 4, required: true },
  explanation: { type: String, required: true },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  topic: { type: Schema.Types.ObjectId, ref: 'Topic', index: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  type: { type: String, enum: ['mcq', 'structured'], default: 'mcq' },
  source: String,
  year: Number,
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true }
}, { timestamps: true }));

export const Attempt = model('Attempt', new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  responses: [{ question: { type: Schema.Types.ObjectId, ref: 'Question' }, answer: Number, correct: Boolean }],
  score: Number,
  total: Number,
  mode: { type: String, enum: ['practice', 'exam'], default: 'practice' },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true }));

export const Bookmark = model('Bookmark', new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  material: { type: Schema.Types.ObjectId, ref: 'Content', required: true },
  materialType: { type: String, enum: ['note', 'quick-lesson', 'high-yield'], required: true }
}, { timestamps: true }).index({ student: 1, material: 1 }, { unique: true }));

export const Progress = model('Progress', new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  material: { type: Schema.Types.ObjectId, ref: 'Content', required: true },
  completion: { type: Number, min: 0, max: 100, default: 0 },
  bestScore: Number
}, { timestamps: true }));

export const Notification = model('Notification', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: String,
  body: String,
  readAt: Date
}, { timestamps: true }));

