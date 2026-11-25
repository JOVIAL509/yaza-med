import bcrypt from 'bcryptjs';
import { User, Subject } from '../models/index.js';
const subjects = ['Physics', 'Language', 'ICT', 'Mathematics', 'Biology', 'Chemistry'];
export async function seedAdmin() {
  for (const [order, title] of subjects.entries()) await Subject.updateOne({ slug: title.toLowerCase() }, { $setOnInsert: { title, slug: title.toLowerCase(), order, published: true } }, { upsert: true });
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && !(await User.exists({ email: process.env.ADMIN_EMAIL.toLowerCase() }))) {
    await User.create({ name: 'Yaza Med Administrator', email: process.env.ADMIN_EMAIL, role: 'admin', emailVerified: true, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12) });
  }
}
