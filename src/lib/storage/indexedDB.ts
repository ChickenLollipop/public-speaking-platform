/**
 * IndexedDB utilities for storing video blobs and AI analysis data
 * Handles large binary data that exceeds localStorage limits
 */

import { AIAnalysis } from '../types';

const DB_NAME = 'PublicSpeakingPlatform';
const DB_VERSION = 1;

const STORES = {
  VIDEOS: 'videos',
  ANALYSES: 'analyses',
} as const;

/**
 * Check if we're in a browser environment with IndexedDB support
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

/**
 * Open or create the IndexedDB database
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
        db.createObjectStore(STORES.VIDEOS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.ANALYSES)) {
        const analysisStore = db.createObjectStore(STORES.ANALYSES, { keyPath: 'id' });
        // Create index for querying by presentationId
        analysisStore.createIndex('presentationId', 'presentationId', { unique: false });
      }
    };
  });
};

// ============================================================================
// Video Blob Storage
// ============================================================================

export interface VideoBlob {
  id: string; // presentationId
  blob: Blob;
  mimeType: string;
  savedAt: Date;
}

export const saveVideoBlob = async (
  presentationId: string,
  blob: Blob,
  mimeType: string
): Promise<void> => {
  if (!isBrowser()) {
    throw new Error('IndexedDB is not available');
  }

  const db = await openDB();
  try {
    const transaction = db.transaction([STORES.VIDEOS], 'readwrite');
    const store = transaction.objectStore(STORES.VIDEOS);

    const videoBlob: VideoBlob = {
      id: presentationId,
      blob,
      mimeType,
      savedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(videoBlob);

      request.onerror = () => {
        reject(new Error('Failed to save video blob'));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Transaction failed while saving video blob'));
      };
    });
  } catch (error) {
    console.error('Error saving video blob:', error);
    throw error;
  } finally {
    db.close();
  }
};

export const getVideoBlob = async (presentationId: string): Promise<VideoBlob | null> => {
  if (!isBrowser()) {
    throw new Error('IndexedDB is not available');
  }

  const db = await openDB();
  try {
    const transaction = db.transaction([STORES.VIDEOS], 'readonly');
    const store = transaction.objectStore(STORES.VIDEOS);

    return new Promise((resolve, reject) => {
      const request = store.get(presentationId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Convert savedAt back to Date object
          result.savedAt = new Date(result.savedAt);
        }
        resolve(result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get video blob'));
      };
    });
  } catch (error) {
    console.error('Error getting video blob:', error);
    throw error;
  } finally {
    db.close();
  }
};

export const deleteVideoBlob = async (presentationId: string): Promise<void> => {
  if (!isBrowser()) {
    throw new Error('IndexedDB is not available');
  }

  const db = await openDB();
  try {
    const transaction = db.transaction([STORES.VIDEOS], 'readwrite');
    const store = transaction.objectStore(STORES.VIDEOS);

    return new Promise((resolve, reject) => {
      const request = store.delete(presentationId);

      request.onerror = () => {
        reject(new Error('Failed to delete video blob'));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Transaction failed while deleting video blob'));
      };
    });
  } catch (error) {
    console.error('Error deleting video blob:', error);
    throw error;
  } finally {
    db.close();
  }
};

// ============================================================================
// AI Analysis Storage
// ============================================================================

export const saveAnalysis = async (analysis: AIAnalysis): Promise<void> => {
  if (!isBrowser()) {
    throw new Error('IndexedDB is not available');
  }

  const db = await openDB();
  try {
    const transaction = db.transaction([STORES.ANALYSES], 'readwrite');
    const store = transaction.objectStore(STORES.ANALYSES);

    return new Promise((resolve, reject) => {
      const request = store.put(analysis);

      request.onerror = () => {
        reject(new Error('Failed to save analysis'));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Transaction failed while saving analysis'));
      };
    });
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  } finally {
    db.close();
  }
};

export const getAnalysis = async (analysisId: string): Promise<AIAnalysis | null> => {
  if (!isBrowser()) {
    throw new Error('IndexedDB is not available');
  }

  const db = await openDB();
  try {
    const transaction = db.transaction([STORES.ANALYSES], 'readonly');
    const store = transaction.objectStore(STORES.ANALYSES);

    return new Promise((resolve, reject) => {
      const request = store.get(analysisId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Convert createdAt back to Date object
          result.createdAt = new Date(result.createdAt);
        }
        resolve(result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get analysis'));
      };
    });
  } catch (error) {
    console.error('Error getting analysis:', error);
    throw error;
  } finally {
    db.close();
  }
};

export const getAnalysesByPresentationId = async (
  presentationId: string
): Promise<AIAnalysis[]> => {
  if (!isBrowser()) {
    throw new Error('IndexedDB is not available');
  }

  const db = await openDB();
  try {
    const transaction = db.transaction([STORES.ANALYSES], 'readonly');
    const store = transaction.objectStore(STORES.ANALYSES);
    const index = store.index('presentationId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(presentationId);

      request.onsuccess = () => {
        const results = request.result || [];
        // Convert createdAt back to Date objects
        results.forEach((result) => {
          result.createdAt = new Date(result.createdAt);
        });
        resolve(results);
      };

      request.onerror = () => {
        reject(new Error('Failed to get analyses by presentation ID'));
      };
    });
  } catch (error) {
    console.error('Error getting analyses by presentation ID:', error);
    throw error;
  } finally {
    db.close();
  }
};

export const deleteAnalysis = async (analysisId: string): Promise<void> => {
  if (!isBrowser()) {
    throw new Error('IndexedDB is not available');
  }

  const db = await openDB();
  try {
    const transaction = db.transaction([STORES.ANALYSES], 'readwrite');
    const store = transaction.objectStore(STORES.ANALYSES);

    return new Promise((resolve, reject) => {
      const request = store.delete(analysisId);

      request.onerror = () => {
        reject(new Error('Failed to delete analysis'));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Transaction failed while deleting analysis'));
      };
    });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    throw error;
  } finally {
    db.close();
  }
};
