import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (content.trim() === "") {
        throw new ApiError(400, "Content is required in tweet")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if (!tweet) {
        throw new ApiError(400, "Something went wrong while saving tweet to data base")
    }

    return res.status(200).json(new ApiResponse(200, {}, "tweet created successfully"))


    //TODO: create tweet
})

const getUserTweets = asyncHandler(async (req, res) => {

    const allTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userTweets",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "NumLikes",
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$Numlikes"
                },
                userTweets: {
                    $first: "$userTweets"
                }
            }
        }
    ])

    if (!allTweets.length == 0) {
        throw new ApiError(400, "tweets not found")
    }
    return res.status(200).json(new ApiResponse(200, allTweets, "tweets fetched successfully"))
    // TODO: get user tweets
})

const updateTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params;
    const { content } = req.body;

    if (content.trim() === "") {
        throw new ApiError(400, "content is required to update")
    }
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid tweet id")
    }

    const response = await Tweet.findByIdAndUpdate(tweetId, {
        $set: {
            content
        }
    }, { new: true })

    if (!response) {
        throw new ApiError(400, "something went wrong while updating tweet")
    }

    return res.status(200).json(new ApiResponse(200, response, "tweet updated successfully"))

    //TODO: update tweet
})

const deleteTweet = asyncHandler(async (req, res) => {

    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "invalid tweet id")
    }

    const response = await Tweet.findByIdAndDelete(tweetId);

    if(!response){
        throw new ApiError(400, "something went wrong while deleting tweet")
    }

    return res.status(200).json(new ApiResponse(200, {}, "tweet deleted successfully"))
    //TODO: delete tweet
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
