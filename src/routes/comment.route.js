import { Router } from "express";
import { createComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.use(verifyJWT)

router.route('/').post(createComment)
router.route('/:commentId').patch(updateComment).delete(deleteComment)
router.route('/:videoId').get(getVideoComments)

export default router