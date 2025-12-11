import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteVideo, getAllVideos, getVideoById, publishedVideo, togglePublishedStatus, updateVideoDetails } from "../controllers/video.controller.js";

const router = Router()
router.use(verifyJWT)

router.route('/').get(getAllVideos)
router.route('/published-video').post(upload.fields([
    {
        name: "videoFile",
        maxCount: 1
    },
    {
        name: "thumbnail",
        maxCount: 1
    }
]), publishedVideo)

router.route('/:id')
.get(getVideoById)
.delete(deleteVideo)
.patch(upload.single("thumbnail"), updateVideoDetails)

router.route('/toggle-status/:id').patch(togglePublishedStatus)

export default router