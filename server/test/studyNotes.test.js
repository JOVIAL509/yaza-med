import test from 'node:test';
import assert from 'node:assert/strict';
import { findSubjectFolder } from '../src/services/studyNotes.js';

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
