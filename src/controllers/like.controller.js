import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    const {responce, isLiked, totalLikes} = await toggleLike(
        Video,
        videoId,
        req.user?._id
    );

    return res.status(200).json(
        new ApiResponse(200, {totalLikes}, isLiked ? "like removed successfully" : "liked successfully")
    )

    //TODO: toggle like on video
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    const {responce, isLiked, totalLikes} = await toggleLike(
        Comment,
        commentId,
        req.user?._id
    );

    return res.status(200).json(
        new ApiResponse(200, {totalLikes}, isLiked ? "like removed successfully" : "liked successfully")
    )
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    const {response, isLiked, totalLikes} = toggleLike(
        Tweet,
        tweetId,
        req.user._id
    )

    return res.status(200).json(
        new ApiResponse(200, {totalLikes}, isLiked ? "like remove successfully" : "like successfully")
    )
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {

    const {userId} = req.user._id;

    const likedVideos = await Like.aggregate([
        {
            $match: {
                $and: [
                    {likedBy: mongoose.Types.ObjectId(userId)},
                    {video: {$exists: true}}
                ]
                
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
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
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                details: {
                    $first: "$video"
                }
            }
        }

    ])

    if(!likedVideos){
        throw new ApiError(400, "Something went wrong while getting Liked videos")
    }

    return res.status(200).json(
        new ApiResponse(200, likedVideos, "likedVidoes fetched successfully")
    )
    //TODO: get all liked videos
})


const toggleLike = async (Model, resourceID, userID) => {
    if (!isValidObjectId(resourceID) || !isValidObjectId(userID)) {
        throw new ApiError("Invalid ResourceID or UserID");
    }

    const model = Model.modelName;

    const isLiked = await Like.findOne({
        [model.toLowerCase()]: resourceID,
        likedBy: userID,
    });

    let responce;
    try {
        if (!isLiked) {
            responce = await Like.create({
                [model.toLowerCase()]: resourceID,
                likedBy: userID,
            });
        } else {
            responce = await Like.deleteOne({
                [model.toLowerCase()]: resourceID,
                likedBy: userID,
            });
        }
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Something went wrong in ToggleLike."
        );
    }

    const totalLikes = await Like.countDocuments({
        [model.toLowerCase()]: resourceID,
    });

    return { responce, isLiked, totalLikes };
};



export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}