import { Router } from "express";
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { getChannelSubscribers, getSubscribedChannel, toggleSubscription } from "../controllers/subscription.controller.js";

const router = Router()
router.use(verifyJWT)

router.route('/:channelId').post(toggleSubscription).get(getChannelSubscribers)
router.route('/u/:subscriberId').get(getSubscribedChannel)

export default router