import mongoose, { isValidObjectId } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"



import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import { ApiError, ApiResponse } from './utils'; // Adjust path as needed
import { response } from "express"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id; // Ensure this is correctly extracted

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const userStats = await User.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(userId),
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
            },
        },
        // Lookup for videos
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
            },
        },
        {
            $unwind: {
                path: "$videos",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $group: {
                _id: "$_id",
                fullName: { $first: "$fullName" },
                username: { $first: "$username" },
                avatar: { $first: "$avatar" },
                totalViews: { $sum: "$videos.views" },
                totalVideos: { $sum: 1 },
                videoIds: { $push: "$videos._id" },
            },
        },
        {
            $lookup: {
                from: "likes",
                let: { videoIds: "$videoIds" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ["$video", "$$videoIds"],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalLikes: { $sum: 1 },
                        },
                    },
                ],
                as: "likes",
            },
        },
        {
            $unwind: {
                path: "$likes",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                let: { userId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ["$subscriber", "$$userId"] },
                                    { $eq: ["$channel", "$$userId"] },
                                ],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalSubscribers: {
                                $sum: {
                                    $cond: [{ $eq: ["$channel", "$$userId"] }, 1, 0],
                                },
                            },
                            totalSubscribedTo: {
                                $sum: {
                                    $cond: [{ $eq: ["$subscriber", "$$userId"] }, 1, 0],
                                },
                            },
                        },
                    },
                ],
                as: "subscriptions",
            },
        },
        {
            $unwind: {
                path: "$subscriptions",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "owner",
                as: "comments",
            },
        },
        {
            $lookup: {
                from: "tweets",
                localField: "_id",
                foreignField: "owner",
                as: "tweets",
            },
        },
        {
            $addFields: {
                numberOfComments: { $size: "$comments" },
                numberOfTweets: { $size: "$tweets" },
                totalLikes: { $ifNull: ["$likes.totalLikes", 0] },
                totalSubscribers: { $ifNull: ["$subscriptions.totalSubscribers", 0] },
                totalSubscribedTo: { $ifNull: ["$subscriptions.totalSubscribedTo", 0] },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                totalViews: 1,
                totalVideos: 1,
                totalLikes: 1,
                totalSubscribers: 1,
                totalSubscribedTo: 1,
                numberOfComments: 1,
                numberOfTweets: 1,
            },
        },
    ]);

    if (!userStats.length) {
        throw new ApiError(400, "Something went wrong while fetching data for the dashboard");
    }

    return res.status(200).json(
        new ApiResponse(200, userStats[0], "Data fetched successfully for the dashboard")
    );
});


const getChannelVideos = asyncHandler(async (req, res) => {

    const {userId} = req.user?._id

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    Video.aggregate([
        {
            $match: {
                owner: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "videoLikes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "numComments"
            }
        },
        {
            $addFields: {
                videoLikes: {
                    $size: "$videoLikes"
                },
                numComments: {
                    $size: "$numComments"
                }
            }
        }
    ])

    if(!response){
        throw new ApiError(400, "Something went wrong while fetching all videos uploaded by the channel")
    }

    return res.status(200).json(
        new ApiResponse(200, response, "All videos fetched successfully")
    )

    
    // TODO: Get all the videos uploaded by the channel
})

export {
    getChannelStats, 
    getChannelVideos
    }