import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localPath) => {
    try {
        if (!localPath) return null

        const response = await cloudinary.uploader.upload(localPath, {
            resource_type: "auto",
        })

        fs.unlinkSync(localPath)
        return response;
    } catch (error) {
        fs.unlinkSync(localPath)
        return error
    }
}

const deleteFromCloudinary = async (url) => {
    try {
        if (!url) return null;

        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const publicId = fileName.split('.')[0];

        const resourceType = url.includes('/video/') ? 'video' : 'image';

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });

        return result;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary }