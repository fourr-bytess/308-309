import mongoose from "mongoose";
import bandModel from "./band.js";

function getBands(name, member_names, genres, locations, price_range) {
    let promise;
    const query = {};
    if (name) {
        query.name = name.toLowerCase();
    }
    if (member_names) {
        query.member_names = { $in: member_names.map(m => m.toLowerCase())};
    }
    if (genres?.length) {
        query.genres = { $in: genres.map(g => g.toLowerCase())};
    }
    if (locations?.length) {
        query.locations = { $in: locations.map(l => l.toLowerCase())};
    }
    if (price_range?.length === 2) {
        query.price = {
            $gte: price_range[0],
            $lte: price_range[1]
        };
    }
    promise = bandModel.find(query);
    return promise;
}

function findBandById(id) {
    return bandModel.findById(id);
}

function addBand(band) {
    const bandToAdd = new bandModel(band);
    const promise = bandToAdd.save();
    return band;
}

function findBandByIdAndDelete(id) {
    return bandModel.findByIdAndDelete(id);
}


export default {
    addBand,
    getBands,
    findBandById,
    findBandByIdAndDelete
};