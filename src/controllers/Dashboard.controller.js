import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { Subscription } from "../models/subscription.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { apiResponse } from "../utils/apiResponse.js";

const getChannelStats = asyncHandler(async (req, res) => {

    const { channelId } = req.params

    if (!mongoose.isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel's id")
    }

    const totalSubscribers = await Subscription.countDocuments({ channel: channelId })

    const videos = await Video.find(
        {
            owner: channelId
        },
        {
            title: 1,
            views: 1
        }
    )

    const totalVideos = videos.length
    const videoIds = videos.map((v) => v._id)

    const totalLikes = await Like.countDocuments({
        video: {
            $in: videoIds
        }
    })

    return res.status(200).json(new apiResponse(200, { totalSubscribers, videos, totalVideos, totalLikes }, "Channel's stats fetched SuccessFully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, sortBy, channelId } = req.query

    if (page < 1) {
        throw new apiError(400, "Page must be 1 or higher")
    }

    if (!mongoose.isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel's id")
    }

    const match = {
        isPublished: true,
        owner: new mongoose.Types.ObjectId(channelId)
    }

    const sort = {}
    sort[sortBy] = 1

    const aggregate = Video.aggregate([
        {
            $match: match
        },
        {
            $project: {
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                views: 1,
                duration: 1,
                createdAt: 1
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

    const channelVideos = await Video.aggregatePaginate(aggregate, options)

    if (!channelVideos || channelVideos.docs.length === 0) {
        return res.status(200).json(new apiResponse(200, { docs: [], totalDocs: 0 }, "No video found"))
    }

    return res.status(200).json(new apiResponse(200, channelVideos, "Fetched all channel's videos SuccessFully"))
})

export {
    getChannelStats,
    getChannelVideos,
}