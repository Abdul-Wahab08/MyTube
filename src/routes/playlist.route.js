import { Router } from "express";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylist, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.use(verifyJWT)

router.route('/').post(createPlaylist)
router.route('/user-playlist/:userId').get(getUserPlaylist)
router.route('/playlist-by-id/:playlistId').get(getPlaylistById).delete(deletePlaylist).patch(updatePlaylist)
router.route('/add/:videoId/:playlistId').patch(addVideoToPlaylist)
router.route('/remove/:videoId/:playlistId').patch(removeVideoFromPlaylist)

export default router
