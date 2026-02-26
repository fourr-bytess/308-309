import mongoose from "mongoose";
import musicianModel from "./musician.js";

const MUSICIAN_SELECT = 'name band_affiliations instruments bio';

function buildMusiciansQuery(filters = {}) {
    const query = {};
    if (filters.name) {
        query.name = filters.name.toLowerCase();
    }
    if (filters.band_affiliations) {
        query.band_affiliations = { $in: filters.band_affiliations.map(m => m.toLowerCase()) };
    }
    if (filters.instruments?.length) {
        query.instruments = { $in: filters.instruments.map(g => g.toLowerCase()) };
    }
    if (filters.bio?.length) {
        query.bio = { $in: filters.bio.map(g => g.toLowerCase()) };
    }
    return query;
}

function getMusicians(name, band_affiliations, instruments) {
    const query = buildMusiciansQuery({ name, band_affiliations, instruments });
    return musicianModel.find(query).select(MUSICIAN_SELECT);
}

function getMusiciansCount(filters = {}) {
    return musicianModel.countDocuments(buildMusiciansQuery(filters));
}

function getMusiciansPaginated(limit, offset, filters = {}) {
    const query = buildMusicianssQuery(filters);
    const musiciansPromise = musicianModel.find(query).skip(offset).limit(limit).select(MUSICIAN_SELECT);
    const countPromise = musicianModel.countDocuments(query);
    return Promise.all([musiciansPromise, countPromise]).then(([musicians, total]) => ({ musicians, total }));
}


function findMusicianById(id) {
    return musicianModel.findById(id);
}

function addMusician(musician) {
    const musicianToAdd = new musicianModel(musician);
    return musicianToAdd.save();
}

function findMusicianByIdAndDelete(id) {
    return musicianModel.findByIdAndDelete(id);
}



export default {
    addMusician,
    getMusicians,
    getMusiciansCount,
    getMusiciansPaginated,
    findMusicianById,
    findMusicianByIdAndDelete
};