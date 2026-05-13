export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  key?: string;
  error?: string;
}

/**
 * Upload a video file to S3 using a presigned URL
 */
export async function uploadVideoToS3(
  file: File,
  presignedUrl: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: `Upload failed with status ${xhr.status}`,
        });
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: 'Network error during upload',
      });
    });

    xhr.addEventListener('abort', () => {
      resolve({
        success: false,
        error: 'Upload cancelled',
      });
    });

    // Send the file
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.send(file);
  });
}

/**
 * Validate video file before upload
 */
export function validateVideoFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload MP4, MOV, or WebM.',
    };
  }

  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 500MB.',
    };
  }

  // Check minimum size (1KB)
  if (file.size < 1024) {
    return {
      valid: false,
      error: 'File too small. Please upload a valid video.',
    };
  }

  return { valid: true };
}

/**
 * Format bytes to human readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
