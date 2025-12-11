import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { apiResponse } from "../utils/apiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {

    const { channelId } = req.params

    if (!mongoose.isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel's id")
    }

    const channel = await User.findById(channelId)

    if (!channel) {
        throw new apiError(404, "Channel not found")
    }

    if (channel._id.toString() === req.user?._id.toString()) {
        throw new apiError(403, "Not allowed")
    }

    const Unsubscribed = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    })

    if (Unsubscribed) {
        await Subscription.deleteOne({ _id: Unsubscribed._id })
        return res.status(200).json(new apiResponse(200, {}, "User Unsubscribed the channel Successfully"))
    }

    const subscribed = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })

    if (!subscribed) {
        throw new apiError(500, "Something went wrong while subscribing the channel")
    }

    return res.status(200).json(new apiResponse(200, subscribed, "User Unsubscribed the channel Successfully"))
})

const getChannelSubscribers = asyncHandler(async (req, res) => {

    const { channelId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (page < 1) {
        throw new apiError(400, "Page must be 1 or higher")
    }

    if (limit < 1) {
        throw new apiError(400, "Limit must be 1 or higher")
    }

    if (!mongoose.isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel's id")
    }

    const skip = (page - 1) * Number(limit)

    const channelSubscribers = await Subscription.find({ channel: channelId })
        .select("subscriber")
        .populate("subscriber", "username avatar")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })

    const totalSubscribers = await Subscription.countDocuments({ channel: channelId })

    if (totalSubscribers === 0) {
        return res.status(200).json(new apiResponse(200, {}, "The channel has no subscriber"))
    }

    return res.status(200).json(new apiResponse(200, { channelSubscribers, totalSubscribers }, "Subscribers of the channel fetched Successfully"))
})

const getSubscribedChannel = asyncHandler(async (req, res) => {

    const { subscriberId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (page < 1) {
        throw new apiError(400, "Page must be 1 or higher")
    }

    if (limit < 1) {
        throw new apiError(400, "Limit must be 1 or higher")
    }

    if (!mongoose.isValidObjectId(subscriberId)) {
        throw new apiError(400, "Invalid subscriber's id")
    }

    const skip = (page - 1) * Number(limit)

    const subscribedChannel = await Subscription.find({ subscriber: subscriberId })
        .select("channel")
        .populate("channel", "username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))

    const totalSubscribedChannel = await Subscription.countDocuments({ subscriber: subscriberId })

    if (totalSubscribedChannel === 0) {
        return res.status(200).json(new apiResponse(200, {}, "No subscribed channel yet"))
    }

    return res.status(200).json(new apiResponse(200, { subscribedChannel, totalSubscribedChannel }, "Subscribed channel fetched Successfully"))
})

export {
    toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannel
}
