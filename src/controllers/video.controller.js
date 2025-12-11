import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static'
import mongoose from "mongoose";

const getVideoDuration = async (path) => {
    const data = await ffprobe(path, { path: ffprobeStatic.path })
    return data.streams[0].duration
}

const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    if (page < 1) {
        throw new apiError(400, "Page must be 1 or higher")
    }

    if (limit < 1) {
        throw new apiError(400, "Limit must be 1 or higher")
    }

    const match = {
        isPublished: true
    }

    if (userId && userId.trim().length > 0) {
        if (!mongoose.isValidObjectId(userId)) {
            throw new apiError(400, "Invalid userId format")
        }
        const trimmedUserId = String(userId).trim()
        match.owner = new mongoose.Types.ObjectId(trimmedUserId)
    }

    if (query && query.length > 50) {
        throw new apiError(400, "Query too long")
    }

    if (query) {
        match.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    if (sortType !== "asc" && sortType !== "desc") {
        throw new apiError(400, "SortType must be asc or desc")
    }

    const sort = {}
    sort[sortBy] = sortType === 'asc' ? 1 : -1

    const aggregateVideos = Video.aggregate([
        {
            $match: match
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $addFields: {
                ownerDetails: {
                            $arrayElemAt: ["$ownerDetails", 0],
                        },
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                isPublished: 1,
                views: 1,
                duration: 1,
                createdAt: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullname": 1,
                "ownerDetails.avatar": 1
            }
        },
        {
            $sort: sort
        }
    ])

    const options = {
        page: Number(page),
        limit: Number(limit)
    }

    const allVideos = await Video.aggregatePaginate(aggregateVideos, options)

    if (!allVideos || allVideos.docs.length === 0) {
        return res.status(200).json(new apiResponse(200, { docs: [], totalDocs: 0 }, "No videos found!"))
    }

    return res.status(200).json(new apiResponse(200, allVideos, "Fetched all videos Successfully!"))
})

const publishedVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body

        if (!(title && description)) {
            throw new apiError(400, "Both title and description are required!")
        }

        const videoFileLocalPath = req.files?.videoFile[0]?.path
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path

        if (!(videoFileLocalPath && thumbnailLocalPath)) {
            throw new apiError(400, "Both video file and thumbnail are required!")
        }

        const duration = await getVideoDuration(videoFileLocalPath)

        const videoFile = await uploadOnCloudinary(videoFileLocalPath)
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if (!(videoFile && thumbnail)) {
            throw new apiError(400, "Video and thumbnail are required!")
        }

        const createdVideo = await Video.create({
            title,
            description,
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            duration,
            owner: req.user?._id
        })

        const confirmCreatedVideo = await Video.findById(createdVideo._id)

        if (!confirmCreatedVideo) {
            throw new apiError(500, "Something went wrong while publishing video!")
        }

        return res.status(200).json(new apiResponse(200, confirmCreatedVideo, "Video published successfully!"))
    } catch (error) {
        throw new apiError(500, error?.message || "Something went wrong while publishing the video!")
    }
})

const getVideoById = asyncHandler(async (req, res) => {

    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
        throw new apiError(404, "Invalid Video id")
    }

    const video = await Video.findById(id)

    if (!video) {
        throw new apiError(404, "Video is missing!")
    }

    return res.status(200).json(new apiResponse(200, video, "Video fetched successfully!"))
})

const deleteVideo = asyncHandler(async (req, res) => {

    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
        throw new apiError(404, "Invalid Video id")
    }

    const video = await Video.findById(id)

    if (!video) {
        throw new apiError(404, "Not found")
    }

    await deleteFromCloudinary(video?.videoFile)
    await deleteFromCloudinary(video?.thumbnail)

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not Allowed!")
    }

    await video.deleteOne()

    return res.status(200).json(new apiResponse(200, {}, "video deleted successfully!"))
})

const updateVideoDetails = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params
        const { title, description } = req.body

        if (!mongoose.isValidObjectId(id)) {
            throw new apiError(404, "Invalid Video id")
        }

        if (!(title && description)) {
            throw new apiError(404, "Title and description is required!")
        }

        const thumbnailPath = req.file?.path

        if (!thumbnailPath) {
            throw new apiError(404, "Thumbnail is required!")
        }

        const video = await Video.findById(id)

        if (video.owner.toString() !== req.user?._id.toString()) {
            throw new apiError(403, "Not Allowed!")
        }

        const deleting = await deleteFromCloudinary(video?.thumbnail)
        const thumbnail = await uploadOnCloudinary(thumbnailPath)

        if (!thumbnail) {
            throw new apiError(404, "Thumbnail is required!")
        }

        const updatedVideo = await Video.findByIdAndUpdate(id, {
            $set: {
                title,
                description,
                thumbnail: thumbnail?.url
            }
        },
            {
                new: true
            })

        if (!updatedVideo) {
            throw new apiError(500, "Something went wrong while updating the video")
        }

        return res.status(200).json(new apiResponse(200, updatedVideo, "Video updated Successfully!"))
    } catch (error) {
        throw new apiError(500, error?.message || "Something went wrong while updating the video")
    }
})

const togglePublishedStatus = asyncHandler(async (req, res) => {

    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
        throw new apiError(404, "Invalid Video id")
    }

    const videoFound = await Video.findById(id)

    if (videoFound.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not Allowed!")
    }

    const video = await Video.findByIdAndUpdate(id, [
        {
            $set: {
                isPublished: { $not: "$isPublished" }
            }
        }
    ],
        {
            new: true
        }
    )

    if (!video) {
        throw new apiError(500, "Something went wrong while toggling the status")
    }

    return res.status(200).json(new apiResponse(200, video, "Status is being toggled Successfully!"))
})

export {
    getAllVideos,
    publishedVideo,
    getVideoById,
    deleteVideo,
    updateVideoDetails,
    togglePublishedStatus
}