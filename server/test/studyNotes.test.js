import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyNoteLink, findSubjectFolder } from '../src/services/studyNotes.js';

test('finds a subject folder at the bucket root', async () => {
  const folder = await findSubjectFolder(
    { title: 'Biology', slug: 'biology' },
    [{ name: 'Biology', id: null, metadata: null }],
    async () => assert.fail('A root subject folder should not require another listing')
  );

  assert.equal(folder, 'Biology');
});

test('finds a subject folder beneath a parent directory', async () => {
  const directories = {
    Materials: [{ name: 'biology', id: null, metadata: null }]
  };
  const folder = await findSubjectFolder(
    { title: 'Biology', slug: 'biology' },
    [{ name: 'Materials', id: null, metadata: null }],
    async path => directories[path] || []
  );

  assert.equal(folder, 'Materials/biology');
});

test('does not treat files as subject folders', async () => {
  const folder = await findSubjectFolder(
    { title: 'Biology', slug: 'biology' },
    [{ name: 'biology.pdf', id: 'file-id', metadata: { mimetype: 'application/pdf' } }],
    async () => []
  );

  assert.equal(folder, null);
});

test('preserves the original filename in signed download links', async () => {
  const originalFetch = globalThis.fetch;
  const envKeys = ['SUPABASE_URL', 'SUPABASE_STORAGE_BUCKET', 'SUPABASE_STORAGE_KEY'];
  const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const requestBodies = [];
  process.env.SUPABASE_URL = 'https://storage.example.test';
  process.env.SUPABASE_STORAGE_BUCKET = 'notes';
  process.env.SUPABASE_STORAGE_KEY = 'test-key';
  globalThis.fetch = async (_url, options) => {
    requestBodies.push(JSON.parse(options.body));
    return {
      ok: true,
      json: async () => ({ signedURL: '/object/sign/notes/Physics/wave%20optics.pdf?token=test-token' })
    };
  };

  try {
    const previewUrl = new URL(await createStudyNoteLink('Physics/wave optics.pdf'));
    const downloadUrl = new URL(await createStudyNoteLink('Physics/wave optics.pdf', true));

    assert.equal(previewUrl.searchParams.has('download'), false);
    assert.equal(downloadUrl.searchParams.get('download'), 'wave optics.pdf');
    assert.deepEqual(requestBodies, [{ expiresIn: 3600 }, { expiresIn: 3600 }]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});
