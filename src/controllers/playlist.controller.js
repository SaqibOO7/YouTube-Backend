import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if ([name, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: new mongoose.Types.ObjectId(`${req.user?._id}`)
    })

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while creating playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist created successfully")
    )

    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid userId");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "details",
                pipeline: [
                    {
                        $project: {
                            thumbnail:1
                        }
                    }
                ]
            }
        }
    ])

    if(playlist?.length === 0){
        return res.status(200).json(
            new ApiResponse(200, [], "playlist not found")
        )
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "playlist fetched successfully")
    )
    //TODO: get user playlists
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if(isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlistId")
    }

    const playlist = await Playlist.aggregate([
        {
            $match:{
                _id: mongoose.Types.ObjectId(playlistId)
            } 
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1
                        }
                    }
                ]
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
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        }
    ])

    if(!playlist){
        throw new ApiError(400, "Something went wrong while fetching playlist by Id")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "playlist fetched successfully using playlistId")
    )
    //TODO: get playlist by id
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const playlist = await Playlist.findByIdAndUpdate({
        $addToSet: {
            videos: mongoose.Types.ObjectId(videoId)
        }
    }, { new: true })

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while adding video to playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video added to playlist successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId)) {                     //if(!isValidObjectId(playlistId) || !isValidObjectId(videoId))
        throw new ApiError(400, "Invalid playlistId");      //we can also write it like this
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const playlist = await Playlist.findByIdAndUpdate(playlistId, {
        $pull: {
            videos: mongoose.Types.ObjectId(videoId)            //$in is use to remove multiple videoId at a time
        }
    }, { new: true })

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while removing video from playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "video removed from playlist successfully")
    )
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist not found while deleting")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist deleted successfully")
    )
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }

    if ([name, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const playlist = await Playlist.findByIdAndUpdate(playlistId, {
        $set: {
            name,
            description
        }
    }, { new: true })

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while updating playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist updated successfully")
    )


    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
