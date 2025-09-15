export interface EncodedFile {
  type: string;
  name: string;
  data: string;
}

export const SUPPORTED_FILE_TYPES = {
  // Documents
  'application/pdf': 'application/pdf',
  'application/msword': 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain': 'text/plain',
  'text/csv': 'text/csv',
  'application/json': 'application/json',
  'text/markdown': 'text/markdown',
  'application/rtf': 'application/rtf',
  // Spreadsheets
  'application/vnd.ms-excel': 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Presentations
  'application/vnd.ms-powerpoint': 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Data formats
  'application/xml': 'application/xml',
  'text/xml': 'text/xml',
  'text/html': 'text/html',
  'application/epub+zip': 'application/epub+zip',
  'application/x-yaml': 'application/x-yaml',
  'text/yaml': 'text/yaml',
  'text/x-yaml': 'text/x-yaml',
  // Images (for unified handler)
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/bmp': 'image/bmp',
  'image/webp': 'image/webp',
  'image/svg+xml': 'image/svg+xml'
};

const EXCLUDED_TYPES = ['video/', 'audio/'];

export const isFileTypeSupported = (file: File): boolean => {
  // Check if it's an excluded type (video, audio - images are now supported)
  if (EXCLUDED_TYPES.some(type => file.type.startsWith(type))) {
    return false;
  }
  
  // Check if it's in our supported list or is a text/image type
  return file.type in SUPPORTED_FILE_TYPES || 
         file.type.startsWith('text/') || 
         file.type.startsWith('image/') ||
         file.type === '' || // Some files might not have a mime type
         !!file.name.match(/\.(txt|csv|json|yaml|yml|md|rtf|pdf|doc|docx|xls|xlsx|ppt|pptx|xml|html|epub|jpg|jpeg|png|gif|bmp|webp|svg)$/i);
};

export const encodeFileToBase64 = (file: File): Promise<EncodedFile> => {
  return new Promise((resolve, reject) => {
    if (!isFileTypeSupported(file)) {
      reject(new Error(`File type ${file.type} is not supported. Only documents, text files, and data files are supported.`));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        
        resolve({
          type: file.type || 'application/octet-stream',
          name: file.name,
          data: base64String
        });
      } catch (error) {
        reject(new Error(`Failed to encode file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

// Helper function to get appropriate MIME type based on file extension
export const getMimeTypeFromExtension = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop();
  
  const extensionMap: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    'md': 'text/markdown',
    'rtf': 'application/rtf',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xml': 'application/xml',
    'html': 'text/html',
    'htm': 'text/html',
    'epub': 'application/epub+zip',
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml'
  };
  
  return extensionMap[ext || ''] || 'application/octet-stream';
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};