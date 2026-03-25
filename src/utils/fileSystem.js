import { get, set } from 'idb-keyval';

export async function getStoredDirectoryHandle() {
  try {
    return await get('halos-library-handle');
  } catch (err) {
    console.error('Failed to get stored handle', err);
    return null;
  }
}

export async function setStoredDirectoryHandle(handle) {
  try {
    await set('halos-library-handle', handle);
  } catch (err) {
    console.error('Failed to store handle', err);
  }
}
