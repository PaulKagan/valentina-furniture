/**
 * Cloudinary SDK setup + the two operations every upload/delete flow uses.
 * URL-building (resizing/cropping already-uploaded photos) lives in
 * images.ts instead — this file only ever talks to the Cloudinary API.
 */
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: Buffer, folder = "valentina-furniture") {
  return new Promise<{ url: string; publicId: string; width: number; height: number }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "image" }, (err, result) => {
        if (err || !result) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height });
      })
      .end(file);
  });
}

export async function deleteImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}
