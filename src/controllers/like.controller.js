import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { apiResponse } from '../utils/apiResponse.js'
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video's id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(new apiResponse(200, {}, "Video unliked Successfully"))
    }

    const like = await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    if (!like) {
        throw new apiError(500, "Something went wrong while liking the video")
    }

    return res.status(200).json(new apiResponse(200, like, "Video Liked Successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    if (!mongoose.isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment's id")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new apiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(new apiResponse(200, {}, "Comment unliked Successfully"))
    }

    const like = await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    if (!like) {
        throw new apiError(500, "Something went wrong while liking the comment")
    }

    return res.status(200).json(new apiResponse(200, like, "Comment liked Successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {

    const { tweetId } = req.params

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet's id")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new apiError(404, "Tweet not found")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(new apiResponse(200, {}, "Tweet unliked Successfully"))
    }

    const like = await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if (!like) {
        throw new apiError(500, "Something went wrong while liking the tweet")
    }

    return res.status(200).json(new apiResponse(200, like, "Tweet like Successfully"))
})

const getVideoLikes = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { page = 1, limit = 20 } = req.query

    if (page < 1) {
        throw new apiError(400, "Page must be 1 or higher")
    }

    if (limit < 1) {
        throw new apiError(400, "Limit must be 1 or higher")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video's id")
    }

    const skip = (page - 1) * Number(limit)

    const likedVideos = await Like.find({ video: videoId })
        .select("likedBy createdAt")
        .populate("likedBy", "username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))

    const totalLikes = await Like.countDocuments({ video: videoId })

    if (likedVideos.length < 1) {
        return res.status(200).json(new apiResponse(200, [], "There is no likes of the video"))
    }

    return res.status(200).json(new apiResponse(200, { likedVideos, totalLikes }, "All likes of the video fetched Successfully"))
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getVideoLikes
}