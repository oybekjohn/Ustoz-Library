const EXTENSIONS = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'text/plain': 'txt',
};

function slug(value) {
  return (value || 'file')
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase()
    .slice(0, 60) || 'file';
}

export function createStorageKey(directory, fileName, contentType) {
  const ext = EXTENSIONS[contentType] || 'bin';
  const base = slug((fileName || 'file').replace(/\.[^.]+$/, ''));
  return `${directory}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}.${ext}`;
}

export async function putObject(bucket, key, body, contentType) {
  await bucket.put(key, body, {
    httpMetadata: { contentType },
  });
  return key;
}

export async function deleteObjects(bucket, keys) {
  for (const key of keys.filter(Boolean)) {
    try {
      await bucket.delete(key);
    } catch {
      // Cleanup xatosi asosiy xatoni yashirmasligi kerak.
    }
  }
}
