import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 seconds timeout
});

export const localUploadService = {
  upload: async (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data; // { id, url, webViewLink }
  }
};

export const cloudinaryService = {
  upload: async (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/cloudinary/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data; // { id, url, webViewLink }
  }
};

export const driveService = {
  upload: async (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/drive/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data; // { id, url, webViewLink }
  }
};

export const imageService = {
  upload: async (file: File, onProgress?: (progress: number) => void) => {
    // Primary: Localhost file upload
    try {
      return await localUploadService.upload(file, onProgress);
    } catch (localErr) {
      console.warn("Local upload failed, trying Cloudinary/Drive endpoints...", localErr);
      try {
        return await cloudinaryService.upload(file, onProgress);
      } catch (err) {
        return await driveService.upload(file, onProgress);
      }
    }
  }
};

export const sheetsService = {
  getAll: async (sheetName: string) => {
    const response = await api.get(`/sheets/${encodeURIComponent(sheetName)}`);
    return response.data;
  },
  
  create: async (sheetName: string, data: any) => {
    const response = await api.post(`/sheets/${encodeURIComponent(sheetName)}`, { data });
    return response.data;
  },

  delete: async (sheetName: string, id: string) => {
    const response = await api.delete(`/sheets/${encodeURIComponent(sheetName)}/${encodeURIComponent(id)}`);
    return response.data;
  },

  update: async (sheetName: string, id: string, data: any) => {
    const response = await api.put(`/sheets/${encodeURIComponent(sheetName)}/${encodeURIComponent(id)}`, { data });
    return response.data;
  }
};

// Aliases for clear naming
export const dataService = sheetsService;
export default { dataService, sheetsService, imageService };
