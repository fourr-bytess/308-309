import mongoose from "mongoose";
import musicianModel from "./musician.js";

const MUSICIAN_SELECT =
  "name band_affiliations instruments bio profile_picture_url gallery_images video_urls";

function buildMusiciansQuery(filters = {}) {
  const query = {};
  if (filters.name) {
    query.name = filters.name.toLowerCase();
  }
  if (filters.band_affiliations) {
    query.band_affiliations = {
      $in: filters.band_affiliations.map((m) => m.toLowerCase()),
    };
  }
  if (filters.instruments?.length) {
    query.instruments = {
      $in: filters.instruments.map((g) => g.toLowerCase()),
    };
  }
  if (filters.bio?.length) {
    query.bio = { $in: filters.bio.map((g) => g.toLowerCase()) };
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
  const query = buildMusiciansQuery(filters);
  const musiciansPromise = musicianModel
    .find(query)
    .skip(offset)
    .limit(limit)
    .select(MUSICIAN_SELECT);
  const countPromise = musicianModel.countDocuments(query);
  return Promise.all([musiciansPromise, countPromise]).then(
    ([musicians, total]) => ({ musicians, total })
  );
}

function findMusicianById(id) {
  return musicianModel.findById(id);
}

function findOwnedMusicianByUserId(ownerUserId) {
  return musicianModel.findOne({ owner_user: ownerUserId });
}

function findMusicianByName(name) {
  return musicianModel.findOne({ name: String(name || "").toLowerCase() });
}

function claimMusicianOwnership(id, ownerUserId) {
  return musicianModel.findByIdAndUpdate(
    id,
    { owner_user: ownerUserId },
    { new: true, runValidators: true }
  );
}

function addMusician(musician) {
  const musicianToAdd = new musicianModel(musician);
  return musicianToAdd.save();
}

function findMusicianByIdAndDelete(id) {
  return musicianModel.findByIdAndDelete(id);
}

function updateMusicianProfilePicture(id, profile_picture_url) {
  return musicianModel.findByIdAndUpdate(
    id,
    { profile_picture_url },
    { new: true, runValidators: true }
  );
}

function updateMusicianProfile(id, updateData) {
  return musicianModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );
}

function addMusicianGalleryImage(id, imageUrl) {
  return musicianModel.findByIdAndUpdate(
    id,
    { $push: { gallery_images: imageUrl } },
    { new: true, runValidators: true }
  ).lean();
}

function removeMusicianGalleryImage(id, imageUrl) {
  return musicianModel.findByIdAndUpdate(
    id,
    { $pull: { gallery_images: imageUrl } },
    { new: true, runValidators: true }
  );
}

function addMusicianVideo(id, videoId) {
  return musicianModel.findByIdAndUpdate(
    id,
    { $push: { video_urls: videoId } },
    { new: true }
  );
}

function removeMusicianVideo(id, videoId) {
  return musicianModel.findByIdAndUpdate(
    id,
    { $pull: { video_urls: videoId } },
    { new: true }
  );
}

export default {
  addMusician,
  getMusicians,
  getMusiciansCount,
  getMusiciansPaginated,
  findMusicianById,
  findOwnedMusicianByUserId,
  findMusicianByName,
  claimMusicianOwnership,
  findMusicianByIdAndDelete,
  updateMusicianProfilePicture,
  updateMusicianProfile,
  addMusicianGalleryImage,
  removeMusicianGalleryImage,
  addMusicianVideo,
  removeMusicianVideo,
};
