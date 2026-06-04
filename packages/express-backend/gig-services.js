import mongoose from "mongoose";
import gigModel from "./gig.js";

const GIG_SELECT =
  "name description genres location address capacity price_range date time host owner_user booked bands_hired gallery_images video_urls";
function buildGigsQuery(filters = {}) {
  const query = {};
  if (filters.name) {
    query.name = filters.name.toLowerCase();
  }
  if (filters.description) {
    query.description = filters.description.toLowerCase();
  }
  if (filters.genres?.length) {
    query.genres = { $in: filters.genres.map((g) => g.toLowerCase()) };
  }
  if (filters.location) {
    query.location = filters.location.toLowerCase();
  }
  if (filters.price_range?.length === 2) {
    query.price_range = {
      $gte: filters.price_range[0],
      $lte: filters.price_range[1],
    };
  }
  if (filters.date) {
    query.date = filters.date;
  }
  if (filters.time?.length === 2) {
    query.time = {
      $gte: filters.time[0],
      $lte: filters.time[1],
    };
  }
  if (filters.host) {
    query.host = filters.host;
  }
  if (typeof filters.booked === "boolean") {
    query.booked = filters.booked;
  }
  if (filters.bands_hired?.length) {
    query.bands_hired = { $in: filters.bands_hired };
  }
  return query;
}

function getGigs(
  name,
  description,
  genres,
  location,
  price_range,
  date,
  time,
  host,
  booked,
  bands_hired
) {
  const query = buildGigsQuery({
    name,
    description,
    genres,
    location,
    price_range,
    date,
    time,
    host,
    booked,
    bands_hired,
  });
  return gigModel.find(query).select(GIG_SELECT);
}

function getGigsCount(filters = {}) {
  return gigModel.countDocuments(buildGigsQuery(filters));
}

function getGigsPaginated(limit, offset, filters = {}) {
  const query = buildGigsQuery(filters);
  const gigsPromise = gigModel
    .find(query)
    .skip(offset)
    .limit(limit)
    .select(GIG_SELECT);
  const countPromise = gigModel.countDocuments(query);
  return Promise.all([gigsPromise, countPromise]).then(([gigs, total]) => ({
    gigs,
    total,
  }));
}

function findGigById(id) {
  return gigModel.findById(id);
}

function addGig(gig) {
  const gigToAdd = new gigModel(gig);
  return gigToAdd.save();
}

function findGigByIdAndDelete(id) {
  return gigModel.findByIdAndDelete(id);
}

function addGigGalleryImage(id, imageUrl) {
  return gigModel.findByIdAndUpdate(
    id,
    { $push: { gallery_images: imageUrl } },
    { new: true, runValidators: true }
  );
}

function removeGigGalleryImage(id, imageUrl) {
  return gigModel.findByIdAndUpdate(
    id,
    { $pull: { gallery_images: imageUrl } },
    { new: true, runValidators: true }
  );
}

function addGigVideo(id, videoId) {
  return gigModel.findByIdAndUpdate(
    id,
    { $push: { video_urls: videoId } },
    { new: true }
  );
}

function removeGigVideo(id, videoId) {
  return gigModel.findByIdAndUpdate(
    id,
    { $pull: { video_urls: videoId } },
    { new: true }
  );
}

function updateGigProfile(id, updateData) {
  return gigModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );
}

export default {
  addGig,
  getGigs,
  getGigsCount,
  getGigsPaginated,
  findGigById,
  findGigByIdAndDelete,
  addGigGalleryImage,
  removeGigGalleryImage,
  addGigVideo,
  removeGigVideo,
  updateGigProfile
};
