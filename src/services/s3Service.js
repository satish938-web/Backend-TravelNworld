import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../config/s3Config.js";
import { ENV } from "../config/ENV.js";

/**
 * Clean filename: remove spaces, special characters, and convert to lowercase.
 * This prevents URL encoding issues and keeps S3 keys clean.
 */
const sanitizeFileName = (fileName) => {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w.-]+/g, ""); // Remove special characters except dots and hyphens
};

/**
 * Generate a presigned URL for UPLOADING a file directly from the frontend (PUT).
 * @param {string} fileName - Original name of the file.
 * @param {string} fileType - MIME type (e.g., image/jpeg).
 * @param {string} folder - Destination folder in S3 bucket.
 * @returns {Promise<{uploadUrl: string, fileKey: string}>}
 */
export const generatePresignedUrl = async (fileName, fileType, folder = "uploads") => {
  const sanitized = sanitizeFileName(fileName);
  const fileKey = `${folder}/${Date.now()}-${sanitized}`;
  
  const command = new PutObjectCommand({
    Bucket: ENV.AWS_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
  });

  // The upload URL will expire in 5 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { 
    expiresIn: 300 
  });
  
  return { uploadUrl, fileKey };
};

/**
 * Generate a presigned URL for VIEWING a private S3 object (GET).
 * @param {string} fileKey - The S3 object key or a full URL (will be parsed).
 * @param {number} expiresIn - Expiration time in seconds (default 1 hour).
 * @returns {Promise<string>} - Temporary public viewing URL.
 */
export const getPresignedViewUrl = async (fileKey, expiresIn = 14400) => {
  if (!fileKey) return "";
  
  // If the input is a full URL but NOT from our bucket (e.g., old Cloudinary links),
  // return it as is.
  if (fileKey.startsWith('http') && !fileKey.includes(ENV.AWS_BUCKET_NAME)) {
    return fileKey;
  }

  // If it's a full S3 URL, we extract the path (key) from it.
  // Otherwise, we assume it's already a key.
  let key = fileKey;
  if (fileKey.startsWith('http')) {
    try {
      const url = new URL(fileKey);
      // If it's an S3 URL like https://bucket.s3.region.amazonaws.com/key
      // or https://s3.region.amazonaws.com/bucket/key
      // we need the path without the leading slash.
      let pathname = url.pathname;
      if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
      }
      
      // If the URL format is s3.region.amazonaws.com/bucket/key, 
      // we need to remove the bucket name from the key.
      if (pathname.startsWith(ENV.AWS_BUCKET_NAME + '/')) {
        pathname = pathname.substring(ENV.AWS_BUCKET_NAME.length + 1);
      }
      
      key = pathname;
    } catch (e) {
      // Fallback: split by .amazonaws.com/ and remove query string
      const urlParts = fileKey.split('.amazonaws.com/');
      if (urlParts.length > 1) {
        key = urlParts[1].split('?')[0];
      }
    }
  }

  try {
    const command = new GetObjectCommand({
      Bucket: ENV.AWS_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Error generating presigned view URL:", error);
    return fileKey; // Fallback to original key/URL if signing fails
  }
};
