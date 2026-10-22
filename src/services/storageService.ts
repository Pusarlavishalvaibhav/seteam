import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../lib/firebase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

/**
 * Validates food photo before uploading
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Please select a JPEG, PNG, or WebP image.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds the 5MB limit (${sizeMb} MB). Please choose a smaller image.`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a food listing photo to Firebase Storage under listings/{providerId}/{timestamp}_{filename}
 */
export async function uploadListingImage(
  file: File,
  providerId: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Object URLs are temporary browser-only URLs and disappear after refresh/logout.
  // Require Firebase Storage for any listing image intended to persist across devices.
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Food photo uploads need Firebase configured. Add the VITE_FIREBASE_* settings and enable Firebase Storage, then try again.');
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `foodListings/${providerId}/${Date.now()}_${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      providerId,
      uploadedAt: new Date().toISOString(),
    },
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error('PlateConnect Storage Error:', error);
        reject(new Error(`Failed to upload image: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (urlError: any) {
          reject(new Error(`Failed to retrieve image URL: ${urlError.message}`));
        }
      }
    );
  });
}
