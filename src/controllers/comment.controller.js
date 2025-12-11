import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createComment = asyncHandler(async (req, res) => {

    const { content, videoId } = req.body

    if (!(content && videoId)) {
        throw new apiError(400, "Comment's content and video's id are required")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    const comment = await Comment.create({
        owner: req.user?._id,
        video: videoId,
        content: content
    })

    if (!comment) {
        throw new apiError(500, "Something went wrong while creating comment")
    }

    return res.status(200).json(new apiResponse(200, comment, "Comment created Successfully"))
})

const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params
    const { content } = req.body

    if (!mongoose.isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment's id")
    }

    if (!content) {
        throw new apiError(400, "Comment's content is required")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new apiError(500, "Something went wrong while updating comment")
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not allowed")
    }

    comment.content = content
    await comment.save()

    return res.status(200).json(new apiResponse(200, comment, "Comment updated Successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    if (!mongoose.isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment's id")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new apiError(500, "Something went wrong while updating comment")
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(403, "Not allowed")
    }

    await comment.deleteOne()

    return res.status(200).json(new apiResponse(200, {}, "Comment deleted Successfully"))
})

const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if(!mongoose.isValidObjectId(videoId)){
        throw new apiError(400, "Invalid video's id")
    }

    if (page < 1) {
        throw new apiError(400, "Page must be 1 or higher")
    }

    if (limit < 1) {
        throw new apiError(400, "Limit must be 1 or higher")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new apiError(404, "Video not found")
    }

    const aggregate = Comment.aggregate([
        {
            $match: {
                video: video._id
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
            $sort: {
                createdAt: -1
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
            $project: {
                content: 1,
                "owner._id": 1,
                "owner.username": 1,
                "owner.avatar": 1
            }
        }
    ])

    const options = {
        page: Number(page),
        limit: Number(limit)
    }

    const comments = await Comment.aggregatePaginate(aggregate, options)

    if(!comments){
        throw new apiError(500, "Something went wrong while fetching the comments")
    }

    return res.status(200).json( new apiResponse(200, comments, "Comments fetched Successfully"))
})

export {
    createComment,
    updateComment,
    deleteComment,
    getVideoComments
}