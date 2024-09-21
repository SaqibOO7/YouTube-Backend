import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video Id");
    }

    try {
        const comments = await Comment.aggregate([
            {
                $match: {
                    video: mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
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
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "numLikes",
                }
            },
            {
                $addFields: {
                    numLikes: { 
                        $size: "$numLikes" 
                    },
                },
            },
            {
                $addFields: {
                    ownerDetails: { 
                        $first: "$owner" 
                    },
                },
            },
            {
                $skip: (page - 1) * limit,
            },
            {
                $limit: parseInt(limit),
            }

        ])

        if (!comments || comments.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No Comments Found"));
        }

        return res
            .status(200)
            .json(new ApiResponse(200, comments, "Comments fetched successfully"));

    } catch (error) {
        throw new ApiError(400, "something went wrong while fetching comments")
    }

})

const addComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { content } = req.body
    const { userId } = req.user?._id

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    if (!content) {
        throw new ApiError(400, "Content is required to add comment")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "video not found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: userId
    })

    if (!comment) {
        throw new ApiError(400, "Something went wrong while creating comment")
    }

    return res.status(200).json(
        new ApiResponse(200, comment, "comment created successfully")
    )
    // TODO: add a comment to a video
})

const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params
    const { content } = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid comment id")
    }

    if (!content) {
        throw new ApiResponse(400, "content is required")
    }

    const comment = await Comment.findByIdAndUpdate(commentId, {
        $set: {
            content
        }
    }, { new: true })

    if (!comment) {
        throw new ApiError(400, "Something went wrong while updating comment")
    }

    return res.status(200).json(
        new ApiResponse(200, comment, "comment updated successfully")
    )
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid commentId")
    }

    const comment = await Comment.findByIdAndDelete(commentId)

    if (!comment) {
        throw new ApiError(400, "Something went wrong while deleting comment")
    }

    return res.status(200).json(
        new ApiResponse(200, comment, "comment deleted successfully")
    )
    // TODO: delete a comment
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
