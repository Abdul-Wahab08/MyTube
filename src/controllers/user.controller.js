import { asyncHandler } from '../utils/asyncHandler.js'
import { apiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import { apiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import fs from 'fs'

const createAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new apiError(500, "Something went wrong while generating access and refresh tokens! Please Try again")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { username, fullname, email, password } = req.body

    if ([username, fullname, email, password].some((field) => field?.trim() === "")) {
        throw new apiError(400, "All Fields are required!")
    }

    if (password.length < 8) {
        throw new apiError(400, "Password must be contains atleast 8 characters!")
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(email)) {
        throw new apiError(400, "Please Enter the valid Email address!")
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existingUser) {
        throw new apiError(409, "User already exists!")
    }

    if (!Array.isArray(req.files.avatar)) {
        throw new apiError(404, "Avatar is required!")
    }

    const avatarPath = req.files?.avatar[0]?.path
   
    let coverImagePath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImagePath = req.files?.coverImage[0]?.path
    }

    if (!avatarPath) {
        throw new apiError(404, "Avatar is required!")
    }

    const avatar = await uploadOnCloudinary(avatarPath)
    const coverImage = await uploadOnCloudinary(coverImagePath)

    if (!avatar) {
        throw new apiError(404, "Avatar is required!")
    }

    const createdUser = await User.create({
        email,
        username: username.toLowerCase(),
        fullname,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const confirmCreatedUser = await User.findById(createdUser._id).select(" -password -refreshToken ")

    if (!confirmCreatedUser) {
        throw new apiError(500, "Something went wrong while registering")
    }

    return res.status(201).json(
        new apiResponse(200, confirmCreatedUser, "User is created successfully!")
    )
})

const loginUser = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body

    if (!(username || email)) {
        throw new apiError(404, "Username or Email is required!")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new apiError(404, "User is not registered!")
    }

    const isValidPassword = await user.isCorrectPassword(password)

    if (!isValidPassword) {
        throw new apiError(404, "Please enter the valid password!")
    }

    const { accessToken, refreshToken } = await createAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(" -password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged In Successfully!")
        )
})

const logoutUser = asyncHandler(async (req, res) => {

    User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new apiError(404, "Refresh token not found!")
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        if (!decodedToken) {
            throw new apiError(401, "Unauthorized!")
        }

        const user = await User.findById(decodedToken._id)

        if (!user) {
            throw new apiError(401, "Invalid refresh token!")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new apiError(401, "Refresh token is expired!")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await createAccessAndRefreshToken(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new apiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access Token Refreshed"))
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid access token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body

    if (!(oldPassword && newPassword)) {
        throw new apiError(400, "Both old password and new Password are required!")
    }

    const user = await User.findById(req.user?._id)

    const isOldPasswordCorrect = await user.isCorrectPassword(oldPassword)

    if (!isOldPasswordCorrect) {
        throw new apiError(400, "Invalid old password!")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new apiResponse(200, {}, "Your password is changed Successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {

    return res.status(200).json(new apiResponse(200, req.user, "Current user fetched!"))

})

const updateUserDetails = asyncHandler(async (req, res) => {

    const { fullname, email } = req.body

    if (!(fullname && email)) {
        throw new apiError(400, "Both fullname and email is required!")
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            fullname: fullname,
            email: email
        }
    },
        {
            new: true
        }).select("-password")

    return res.status(200).json(new apiResponse(200, user, "User details is updated Successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarPath = req.file?.path

    if (!avatarPath) {
        throw new apiError(400, "Avatar file is missing!")
    }

    const deleteAvatarPath = req.user?.avatar

    if (!deleteAvatarPath) {
        throw new apiError(500, "Unable to delete the previous Image!")
    }

    await deleteFromCloudinary(deleteAvatarPath)

    const avatar = await uploadOnCloudinary(avatarPath)

    if (!avatar.url) {
        throw new apiError(400, "Error while uploading avatar!")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url
        }
    },
        {
            new: true
        }).select("-password")

    return res.status(200).json(new apiResponse(200, user, "Avatar is updated Successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImagePath = req.file?.path

    if (!coverImagePath) {
        throw new apiError(400, "CoverImage is missing!")
    }

    const deleteCoverImagePath = req.user?.coverImage

    if (deleteCoverImagePath) {
        await deleteFromCloudinary(deleteCoverImagePath)
    }

    const coverImage = await uploadOnCloudinary(coverImagePath)

    if (!coverImage.url) {
        throw new apiError(400, "Error while uploading CoverImage!")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            coverImage: coverImage.url
        }
    },
        {
            new: true
        })

    return res.status(200).json(new apiResponse(200, user, "CoverImage is updated Successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params

    if (!username) {
        throw new apiError(400, "Username is missing!")
    }

    const profile = await User.aggregate([
        {
            $match: {
                username: username
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscribers",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscribed"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                email: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])

    if (!profile.length) {
        throw new apiError(404, "Profile not found!")
    }

    return res.status(200).json(new apiResponse(200, profile[0], "Profile fetched successfully!"))

})

const getUserWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "watchHistory",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "owner",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        }
    ])

    return res.status(200).json(new apiResponse(200, user[0].watchHistory, "Watch history fetched successFully!"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}