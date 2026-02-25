import venueModel from "./venue.js";

function getVenue(name, city, state, zip, capacity_range) {
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
  if (capacity_range?.length === 2) {
    query.capacity = {
      $gte: capacity_range[0],
      $lte: capacity_range[1],
    };
  }
  return venueModel.find(query);
}

function addVenue(venue) {
  const venueToAdd = {
    name: venue.name?.toLowerCase(),
    address: venue.address?.toLowerCase(),
    city: venue.city?.toLowerCase(),
    state: venue.state?.toLowerCase(),
    zip: venue.zip,
    capacity: venue.capacity,
    contact_email: venue.contact_email?.toLowerCase(),
    description: venue.description,
  };

  const newVenue = new venueModel(venueToAdd);
  const promise = newVenue.save();
  return promise;
}

function findVenueById(id) {
  return venueModel.findById(id);
}

function findVenueByIdAndDelete(id) {
  return venueModel.findByIdAndDelete(id);
}

export default {
  getVenue,
  addVenue,
  findVenueById,
  findVenueByIdAndDelete,
};
