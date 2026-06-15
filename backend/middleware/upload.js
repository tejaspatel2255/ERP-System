import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Initialize Supabase Client
let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.error('Failed to initialize Supabase Client:', err.message);
  }
}

// Multer memory storage configuration
const storage = multer.memoryStorage();

// Allowed file types check
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.dwg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, PNG, and DWG files are allowed.'), false);
  }
};

// Export multer upload instance (10MB size limit)
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

/**
 * Upload a file buffer to Supabase Storage Bucket and return the public URL
 * @param {string} bucket - Name of the Supabase bucket
 * @param {Object} file - Express multer file object containing buffer and mimetype
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export const uploadToSupabase = async (bucket, file) => {
  if (!file || !file.buffer) {
    throw new Error('No file provided for upload.');
  }

  // Create unique filename to prevent collisions
  const fileExtension = path.extname(file.originalname);
  const cleanBaseName = path.basename(file.originalname, fileExtension).replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${Date.now()}_${cleanBaseName}${fileExtension}`;

  if (!supabase) {
    console.warn(`Supabase client not initialized. Mocking upload of ${fileName} to bucket ${bucket}.`);
    return `/mock-storage/${bucket}/${fileName}`;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  // Get the public URL of the uploaded file
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to retrieve public URL from Supabase Storage.');
  }

  return publicUrlData.publicUrl;
};

export default { upload, uploadToSupabase };
