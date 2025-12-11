import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getChannelStats, getChannelVideos } from "../controllers/Dashboard.controller.js";

const router = Router()
router.use(verifyJWT)

router.route('/').get(getChannelVideos)
router.route('/:channelId').get(getChannelStats)

export default router