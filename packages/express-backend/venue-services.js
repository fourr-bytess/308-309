import venueModel from "./venue.js";

function getVenue(name, city, state, zip, capacity_range, contact_email) {
  const query = {};

  if (name) {
    query.name = name.toLowerCase();
  }
  if (city) {
    query.city = city.toLowerCase();
  }
  if (state) {
    query.state = state.toLowerCase();
  }
  if (zip) {
    query.zip = zip;
  }
  if (contact_email) {
    query.contact_email = contact_email.toLowerCase();
  }
  if (capacity_range?.length === 2) {
    query.capacity = {
      $gte: capacity_range[0],
      $lte: capacity_range[1],
    };
  }
  return venueModel.find(query);
}

function addVenue(venue) {
  const newVenue = new venueModel(venue);
  const promise = newVenue.save();
  return promise;
}

function findVenueById(id) {
  return venueModel.findById(id);
}

function findOwnedVenueByUserId(ownerUserId) {
  return venueModel.findOne({ owner_user: ownerUserId });
}

function findVenueByContactEmail(contactEmail) {
  return venueModel.findOne({ contact_email: String(contactEmail || "").toLowerCase() });
}

function findVenueByName(name) {
  return venueModel.findOne({ name: String(name || "").toLowerCase() });
}

function claimVenueOwnership(id, ownerUserId) {
  return venueModel.findByIdAndUpdate(
    id,
    { owner_user: ownerUserId },
    { new: true, runValidators: true },
  );
}

function findVenueByIdAndDelete(id) {
  return venueModel.findByIdAndDelete(id);
}

export default {
  getVenue,
  addVenue,
  findVenueById,
  findOwnedVenueByUserId,
  findVenueByContactEmail,
  findVenueByName,
  claimVenueOwnership,
  findVenueByIdAndDelete,
};
