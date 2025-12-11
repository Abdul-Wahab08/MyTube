import mongoose from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { apiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { apiResponse } from "../utils/apiResponse.js"

const createPlaylist = asyncHandler(async (req, res) => {

    const { name, description, videos = [] } = req.body

    if (!(name && description)) {
        throw new apiError(400, "Both name and description of the playlist is required")
    }

    const validVideos = videos.filter((id) => mongoose.Types.ObjectId.isValid(id))

    const existingVideos = await Video.find({
        _id: {
            $in: validVideos
        }
    }).distinct("_id")

    if (existingVideos.length < 1) {
        throw new apiError(400, "Playlist must consist of at least one video")
    }

    const playlist = await Playlist.create({
        name: name,
        description: description,
        videos: existingVideos,
        owner: req.user?._id
    })

    if (!playlist) {
        throw new apiError(500, "Something went wrong while creating playlist")
    }

    return res.status(200).json(new apiResponse(200, playlist, "Playlist created Successfully"))

})

const getUserPlaylist = asyncHandler(async (req, res) => {

    const { userId } = req.params

    if (!mongoose.isValidObjectId(userId)) {
        throw new apiError(400, "Invalid user's id")
    }

    const objectUserId = new mongoose.Types.ObjectId(userId)

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: objectUserId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                "owner._id": 1,
                "owner.username": 1,
                "owner.avatar": 1,
                "videoDetails._id": 1,
                "videoDetails.title": 1,
                "videoDetails.videoFile": 1,
                "videoDetails.thumbnail": 1
            }
        }
    ])

    const total = await Playlist.countDocuments({
        owner: objectUserId
    })

    if (total === 0) {
        throw new apiError(400, "No playlist exist")
    }

    if (playlists.length < 1) {
        throw new apiError(404, "Playlist not found")
    }

    return res.status(200).json(new apiResponse(200, { playlists, total }, "All playlists of the user fetched Successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid plalist's id")
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                "owner._id": 1,
                "owner.username": 1,
                "owner.avatar": 1,
                "owner.fullname": 1,
                "videoDetails._id": 1,
                "videoDetails.title": 1,
                "videoDetails.description": 1,
                "videoDetails.videoFile": 1,
                "videoDetails.thumbnail": 1,
                "videoDetails.views": 1,
                "videoDetails.duration": 1,
                "videoDetails.createdAt": 1
            }
        }
    ])

    if (!playlist || playlist.length === 0) {
        throw new apiError(404, "Playlist not found")
    }

    return res.status(200).json(new apiResponse(200, playlist[0], "Playlist is fetched by id"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!(playlistId && videoId)) {
        throw new apiError(400, "Both playlist and video ids are required")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not allowed")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not allowed")
    }

    if (playlist.videos.some(v => v.equals(videoId))) {
        throw new apiError(404, "Video is already present in the playlist")
    }

    const newPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if (!newPlaylist) {
        throw new apiError(500, "Something went wrong while adding video to playlist")
    }

    return res.status(200).json(new apiResponse(200, newPlaylist, "Video added to the playlist Successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!(playlistId && videoId)) {
        throw new apiError(400, "Both playlist and video ids are required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not allowed")
    }

    if (!playlist.videos.some(v => v.equals(videoId))) {
        throw new apiError(404, "Video not present in the playlist")
    }

    const newPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if (!newPlaylist) {
        throw new apiError(500, "Something went wrong while deleting the vidoe from the playlist")
    }

    return res.status(200).json(new apiResponse(200, newPlaylist, "Video deleted from the playlist Successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new apiError(400, "Playlist's id is missing")
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist Not found")
    }

    return res.status(200).json(new apiResponse(200, {}, "Playlist is deleted Successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params
    const { name, description } = req.body

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist's id")
    }

    if (!(name && description)) {
        throw new apiError(400, "Both name and description are required")
    }

    const playlist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set: {
                name: name,
                description: description
            }
        },
        {
            new: true
        }
    )

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    return res.status(200).json(new apiResponse(200, playlist, "Playlist update Successfully"))
})

export {
    createPlaylist,
    getUserPlaylist,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}