import { auth as fbAuth } from '@/firebase/config';

export interface IStorageService {
  uploadFile(file: File, path: string, onProgress?: (percent: number) => void): Promise<string>;
}

// ─── Cloudinary Upload Service ────────────────────────────────────────────────
// Uses Cloudinary's free unsigned upload API. No Firebase Storage plan needed.
// Free tier: 25GB storage + 25GB bandwidth/month
class CloudinaryStorageService implements IStorageService {
  private cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
  private uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

  isConfigured(): boolean {
    return !!this.cloudName && !!this.uploadPreset &&
      this.cloudName.trim() !== '' && this.uploadPreset.trim() !== '';
  }

  async uploadFile(file: File, path: string, onProgress?: (percent: number) => void): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    // Use the path as a public_id folder prefix so files are organised
    const publicId = `classnotes/${path.replace(/\//g, '_')}`;
    formData.append('public_id', publicId);

    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.secure_url as string);
          } catch (err) {
            console.error('Cloudinary JSON parse error:', err);
            reject(new Error('Failed to parse Cloudinary response.'));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(`Cloudinary upload failed: ${data?.error?.message || xhr.statusText}`));
          } catch {
            reject(new Error(`Cloudinary upload failed: ${xhr.statusText}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload to Cloudinary.'));
      };

      xhr.send(formData);
    });
  }
}

// ─── Sandbox / Local Storage Service ─────────────────────────────────────────
class SandboxStorageService implements IStorageService {
  async uploadFile(file: File, _path: string, onProgress?: (percent: number) => void): Promise<string> {
    if (onProgress) {
      onProgress(10);
      await new Promise(resolve => setTimeout(resolve, 150));
      onProgress(40);
      await new Promise(resolve => setTimeout(resolve, 150));
      onProgress(80);
      await new Promise(resolve => setTimeout(resolve, 150));
      onProgress(100);
    } else {
      await new Promise(resolve => setTimeout(resolve, 450));
    }

    // For large files (> 10MB), return a mock URL to prevent localStorage quota overflow
    if (file.size > 10 * 1024 * 1024) {
      console.warn('File exceeds 10MB sandbox limit. Returning mock file link.');
      return `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to parse file upload data.'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error.'));
      reader.readAsDataURL(file);
    });
  }
}

// ─── Hybrid Storage Service ───────────────────────────────────────────────────
// Priority order:
//   1. Cloudinary (if configured) — free, works for all users
//   2. Sandbox/base64 — for demo accounts or if Cloudinary not configured
class HybridStorageService implements IStorageService {
  private cloudinary = new CloudinaryStorageService();
  private sandbox = new SandboxStorageService();

  private isDemoUser(): boolean {
    const uid = fbAuth?.currentUser?.uid || '';
    return uid.startsWith('demo-') || uid.startsWith('sandbox-') || !uid;
  }

  async uploadFile(file: File, path: string, onProgress?: (percent: number) => void): Promise<string> {
    // Real users: try Cloudinary first
    if (!this.isDemoUser() && this.cloudinary.isConfigured()) {
      try {
        return await this.cloudinary.uploadFile(file, path, onProgress);
      } catch (err: any) {
        console.warn('Cloudinary upload failed, falling back to sandbox storage:', err?.message);
        // Fall through to sandbox
      }
    }
    // Demo users or Cloudinary not configured: use local base64
    return this.sandbox.uploadFile(file, path, onProgress);
  }
}

export const storageService: IStorageService = new HybridStorageService();
