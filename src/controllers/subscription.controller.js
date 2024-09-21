import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const { isSubs } = req.query

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid channel id");
    }

    let subscriptiondoc;
    if (isSubs === true) {
        subscriptiondoc = await Subscription.findOneAndDelete({
            subscriber: req.user?._id,
            channel: channelId
        });
    }
    else {
        subscriptiondoc = await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId
        })
    }

    if (!subscriptiondoc) {
        throw new ApiError(400, "something went wrong while toggling the subscribe");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "toggle subscription successfully")
    )

    // TODO: toggle subscription
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid channel id")
    }

    const subscriberDoc = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                }
            }
        }
    ])

    if (!subscriberDoc) {
        throw new ApiError(400, "Something went wrong while fetching subscriber list of a channel")
    }

    return res.status(200).json(
        new ApiResponse(200, subscriberDoc, "subscriber list fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "invalid subscirbedId")
    }

    const response = await Subscription.aggregate([
        {
            $match: {
                $and: {
                    channel: new mongoose.Types.ObjectId(subscriberId),
                    subscriber: new mongoose.Types.ObjectId(req.user?._id)
                }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelInfo",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        }
    ])

    if (!response) {
        throw new ApiError(400, "something went wrong while fetching channel list")
    }

    return res.status(200).json(
        new ApiResponse(200, response, "channel list fetched successfully")
    )


})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}