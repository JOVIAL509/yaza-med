import { Subject, Topic } from '../models/index.js';

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || 'notes';
const supabaseConfig = () => {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  // These values are only read by the API. Never move them into VITE_* variables.
  const key = process.env.SUPABASE_STORAGE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    const error = new Error('Notes storage is not configured. Set SUPABASE_URL and a server-side storage key.');
    error.status = 503;
    throw error;
  }
  return { url, key };
};

async function storageRequest(endpoint, options = {}) {
  const { url, key } = supabaseConfig();
  // New sb_secret/sb_publishable keys belong only in `apikey`; only legacy JWT keys
  // are valid bearer tokens. Sending an sb_secret value as a bearer token is rejected.
  const authHeaders = key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {};
  const response = await fetch(`${url}/storage/v1${endpoint}`, {
    ...options,
    headers: { apikey: key, ...authHeaders, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  if (!response.ok) {
    const error = new Error(response.status === 404 ? 'The notes storage bucket could not be found.' : 'Unable to load notes from storage. Check the Supabase storage key and bucket permissions.');
    error.status = response.status === 404 ? 503 : 502;
    throw error;
  }
  return response.json();
}

async function listDirectory(prefix) {
  const safePrefix = prefix.replace(/^\/+|\/+$/g, '');
  return storageRequest(`/object/list/${encodeURIComponent(bucket())}`, {
    method: 'POST', body: JSON.stringify({ prefix: safePrefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } })
  });
}

async function listFolder(prefix) {
  const safePrefix = prefix.replace(/^\/+|\/+$/g, '');
  const items = await listDirectory(safePrefix);
  const files = [];
  for (const item of items) {
    const path = safePrefix ? `${safePrefix}/${item.name}` : item.name;
    if (!isStorageFolder(item)) files.push({ path, name: item.name, size: item.metadata?.size || null, contentType: item.metadata?.mimetype || null });
    else if (item.name !== '.' && item.name !== '..') files.push(...await listFolder(path));
  }
  return files;
}

const isStorageFolder = item => Boolean(item?.name) && item.id == null && !item.metadata;
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export async function findSubjectFolder(subject, rootItems, getDirectory = listDirectory) {
  const names = new Set([normalize(subject.slug), normalize(subject.title)]);
  const queue = rootItems
    .filter(isStorageFolder)
    .filter(item => item.name !== '.' && item.name !== '..')
    .map(item => item.name);
  const visited = new Set();

  while (queue.length) {
    const path = queue.shift();
    if (visited.has(path)) continue;
    visited.add(path);
    if (names.has(normalize(path.split('/').pop()))) return path;
    if (path.split('/').length >= 8) continue;
    const children = await getDirectory(path);
    for (const child of children) {
      if (isStorageFolder(child) && child.name !== '.' && child.name !== '..') {
        queue.push(`${path}/${child.name}`);
      }
    }
  }
  return null;
}

export async function listStudyNotes({ subject: subjectFilter, query } = {}) {
  const subjects = await Subject.find({ published: true }).sort({ order: 1, title: 1 }).lean();
  const wanted = normalize(subjectFilter);
  const selected = wanted ? subjects.filter(subject => normalize(subject.title) === wanted || normalize(subject.slug) === wanted) : subjects;
  const rootItems = await listDirectory('');
  const result = [];
  for (const subject of selected) {
    const rootName = await findSubjectFolder(subject, rootItems);
    if (!rootName) continue;
    const files = await listFolder(rootName);
    const topics = await Topic.find({ subject: subject._id, published: true }).sort({ order: 1, title: 1 }).select('title slug order').lean();
    const ranked = files.map(file => {
      const relative = file.path.slice(rootName.length).replace(/^\//, '');
      const folder = relative.includes('/') ? relative.split('/')[0] : '';
      const topicIndex = topics.findIndex(topic => [normalize(topic.title), normalize(topic.slug)].includes(normalize(folder)) || [normalize(topic.title), normalize(topic.slug)].some(name => name && normalize(file.name).includes(name)));
      return { ...file, subject: subject.title, subjectSlug: subject.slug, topic: topicIndex >= 0 ? topics[topicIndex].title : (folder || 'Course materials'), topicOrder: topicIndex >= 0 ? topics[topicIndex].order : Number.MAX_SAFE_INTEGER, _topicIndex: topicIndex };
    }).filter(file => !query || normalize(`${file.name} ${file.topic}`).includes(normalize(query)));
    ranked.sort((a, b) => a.topicOrder - b.topicOrder || (a._topicIndex !== -1 && b._topicIndex !== -1 ? a._topicIndex - b._topicIndex : 0) || collator.compare(a.path, b.path));
    if (ranked.length) result.push({ title: subject.title, slug: subject.slug, order: subject.order, topics: topics.map(topic => ({ title: topic.title, order: topic.order })), files: ranked.map(({ _topicIndex, ...file }) => file) });
  }
  return result;
}

export async function createStudyNoteLink(path, download = false) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const payload = await storageRequest(`/object/sign/${encodeURIComponent(bucket())}/${encodedPath}`, {
    method: 'POST', body: JSON.stringify({ expiresIn: 60 * 60, ...(download ? { download: path.split('/').at(-1) } : {}) })
  });
  const { url } = supabaseConfig();
  const signed = payload.signedURL || payload.signedUrl;
  if (!signed) throw new Error('Supabase did not return a note link.');
  return signed.startsWith('http') ? signed : `${url}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`;
}
