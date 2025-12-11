import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {

    const { content } = req.body

    if (!content) {
        throw new apiError(400, "Tweet must contain content")
    }

    const tweet = await Tweet.create({
        owner: req.user?._id,
        content: content
    })

    if (!tweet) {
        throw new apiError(500, "Something went wrong while creating tweet")
    }

    return res.status(200).json(new apiResponse(200, tweet, "Tweet created Successfully"))

})

const updateTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params
    const { content } = req.body

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid Tweet id")
    }

    if (!content) {
        throw new apiError(400, "Tweet must contain content")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new apiError(500, "Something went wrong while updating tweet")
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not allowed")
    }

    tweet.content = content
    await tweet.save()

    return res.status(200).json(new apiResponse(200, tweet, "Tweet updated Successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params

     if (!mongoose.isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid Tweet id")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new apiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not Allowed!")
    }

    await tweet.deleteOne()

    return res.status(200).json(new apiResponse(200, {}, "Tweet deleted Successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {

    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (page < 1) {
        throw new apiError(400, "Page must be 1 or higher")
    }

    if (limit < 1) {
        throw new apiError(400, "Limit must be 1 or higher")
    }

     if (!mongoose.isValidObjectId(userId)) {
        throw new apiError(400, "Invalid Tweet id")
    }

    const skip = (page - 1) * Number(limit)

    const tweets = await Tweet.find({ owner: userId })
        .select("owner content")
        .populate("owner", "username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(skip))

    const totalTweets = await Tweet.countDocuments({ owner: userId })

    if (tweets.length < 1) {
        return res.status(200).json(new apiResponse(200, [], "There is no tweet of the user"))
    }

    return res.status(200).json(new apiResponse(200, { tweets, totalTweets }, "All the user's tweet fetched Successfully"))
})

export {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets
}