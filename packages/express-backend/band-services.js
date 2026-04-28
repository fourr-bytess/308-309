import mongoose from "mongoose";
import bandModel from "./band.js";

const BAND_SELECT = "name members genres locations price_range profile_picture_url gallery_images";

/** Builds a MongoDB query from filter options (shared by getBands, getBandsCount, getBandsPaginated). */
function buildBandsQuery(filters = {}) {
    const query = {};
    if (filters.name) {
        query.name = filters.name.toLowerCase();
    }
    if (filters.members) {
        query.members = { $in: filters.members.map(m => m.toLowerCase()) };
    }
    if (filters.genres?.length) {
        query.genres = { $in: filters.genres.map(g => g.toLowerCase()) };
    }
    if (filters.locations?.length) {
        query.locations = { $in: filters.locations.map(l => l.toLowerCase()) };
    }
    if (filters.price_range?.length === 2) {
        query.price_range = {
            $gte: filters.price_range[0],
            $lte: filters.price_range[1]
        };
    }
    return query;
}

function getBands(name, members, genres, locations, price_range) {
    const query = buildBandsQuery({ name, members, genres, locations, price_range });
    return bandModel.find(query).select(BAND_SELECT);
}

function getBandsCount(filters = {}) {
    return bandModel.countDocuments(buildBandsQuery(filters));
}

function getBandsPaginated(limit, offset, filters = {}) {
    const query = buildBandsQuery(filters);
    const bandsPromise = bandModel.find(query).skip(offset).limit(limit).select(BAND_SELECT);
    const countPromise = bandModel.countDocuments(query);
    return Promise.all([bandsPromise, countPromise]).then(([bands, total]) => ({ bands, total }));
}


function findBandById(id) {
    return bandModel.findById(id);
}

function addBand(band) {
    const bandToAdd = new bandModel(band);
    return bandToAdd.save();
}

function findBandByIdAndDelete(id) {
    return bandModel.findByIdAndDelete(id);
}

function updateBandProfilePicture(id, profile_picture_url) {
    return bandModel.findByIdAndUpdate(
        id,
        { profile_picture_url },
        { new: true, runValidators: true }
    );
}

function addBandGalleryImage(id, imageUrl) {
    return bandModel.findByIdAndUpdate(
        id,
        { $push: { gallery_images: imageUrl } },
        { new: true, runValidators: true }
    );
}

function removeBandGalleryImage(id, imageUrl) {
    return bandModel.findByIdAndUpdate(
        id,
        { $pull: { gallery_images: imageUrl } },
        { new: true, runValidators: true }
    );
}

function addBandVideo(id, videoId) {
    return bandModel.findByIdAndUpdate(
        id,
        { $push: { video_urls: videoId }},
        { new: true }
    );
}

function removeBandVideo(id, videoId) {
    return bandModel.findByIdAndUpdate(
        id,
        { $pull: { video_urls: videoId }},
        { new: true }
    );
}


export default {
    addBand,
    getBands,
    getBandsCount,
    getBandsPaginated,
    findBandById,
    findBandByIdAndDelete,
    updateBandProfilePicture,
    addBandGalleryImage,
    removeBandGalleryImage,
    addBandVideo,
    removeBandVideo
};