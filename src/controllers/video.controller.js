import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

//NOTE THIS CONTROLLER IS IMPORTANT 
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Validate sortType
    const sortOrder = sortType === 'asc' ? 1 : -1;
    
    // Validate sortBy: You can adjust allowed fields as per your schema
    const allowedSortFields = ["title", "createdAt"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const videos = await Video.aggregate([
        // Only include $match if query is provided
        ...(query
            ? [
                {
                    $match: {
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } }
                        ]
                    }
                }
            ]
            : []
        ),
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "createdBy"
            }
        },
        {
            $unwind: "$createdBy"
        },
        {
            $project: {
                thumbnail: 1,
                videoFile: 1,
                title: 1,
                description: 1,
                createdBy: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                }
            }
        },
        {
            $sort: {
                [sortField]: sortOrder
            }
        },
        {
            $skip: (pageNumber - 1) * limitNumber
        },
        {
            $limit: limitNumber
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            { videos },
            "All videos"
        )
    );  
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title && !description) {
        throw new ApiError(400, "title and description is required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "videoLocalPath is required")
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnailLocalPath is required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(400, "videoFile is required")
    }
    if (!thumbnailFile) {
        throw new ApiError(400, "thumbnailFile is required")
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnailFile.url,
        title,
        description,
        isPublished: true,
        duration: videoFile.duration,
        owner: req.user?._id
    })

    const createdVideo = await Video.findById(video._id);       //not necessary

    if (!createdVideo) {
        throw new ApiError(500, "Something went wrong while uploading the video")
    }

    return res.status(201).json(
        new ApiResponse(200, createdVideo, "Video uploded Successfully")
    )


    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid videoId")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "video not found")
    }

    return res.status(200).json(
        new ApiResponse(200, { video }, "video is fetched successfully")
    )
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const thumbnailLocalPath = req.file?.path;

    if (!title && !description && !thumbnailLocalPath) {
        throw new ApiError(400, "At least one field is required")
    }

    let thumbnail;
    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail.url) {
            throw new ApiError(400, "Error while updating the thumbnail on cloudinary")
        }
    }

    const response = await Video.findByIdAndUpdate(videoId, {
        $set: {
            thumbnail: thumbnail.url,
            title,
            description
        }
    }, { new: true })

    if (!response) {
        throw new ApiError(400, "Something went wrong while updating video details")
    }

    return res.status(200).json(
        new ApiResponse(200, response, "video details updated successfully")
    )

    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if (!deletedVideo) {
        throw new ApiError(400, "video not found");
    }
    return res.status(200).json(
        new ApiResponse(200, {}, "video deleted successfully")
    )
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const response = await Video.findById(videoId);

    if (!response) {
        throw new ApiError(400, "video not found");
    }

    response.isPublished = !response.isPublished;
    await response.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, response, "Publish toggle successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
