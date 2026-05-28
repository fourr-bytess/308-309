import GigRequest from "./gig-request.js";
import Gig from "./gig.js";

const REQUEST_SELECT =
  "gigId bandId venueId bandUserId venueUserId status createdAt updatedAt";

function withRequestDetails(query) {
  return query
    .populate("gigId", "name date time host booked bands_hired")
    .populate("bandId", "name members owner_user")
    .populate("venueId", "name owner_user")
    .select(REQUEST_SELECT);
}

async function createGigRequest(data) {
  const existing = await GigRequest.findOne({
    gigId: data.gigId,
    bandId: data.bandId,
    status: { $in: ["pending", "accepted"] },
  });

  if (existing) {
    return existing;
  }

  return GigRequest.create({
    ...data,
    status: "pending",
  });
}

function getGigRequests(filters = {}) {
  const query = {};
  if (filters.gigId) query.gigId = filters.gigId;
  if (filters.bandId) query.bandId = filters.bandId;
  if (filters.venueId) query.venueId = filters.venueId;
  if (filters.bandUserId) query.bandUserId = filters.bandUserId;
  if (filters.venueUserId) query.venueUserId = filters.venueUserId;
  if (filters.status) query.status = filters.status;

  return withRequestDetails(GigRequest.find(query)).sort({ createdAt: -1 });
}

function findGigRequestById(id) {
  return withRequestDetails(GigRequest.findById(id));
}

async function acceptGigRequest(id) {
  const request = await GigRequest.findById(id);
  if (!request) return null;

  request.status = "accepted";
  await request.save();

  await Gig.findByIdAndUpdate(
    request.gigId,
    {
      booked: true,
      $addToSet: { bands_hired: request.bandId },
    },
    { new: true },
  );

  await GigRequest.updateMany(
    {
      _id: { $ne: request._id },
      gigId: request.gigId,
      status: "pending",
    },
    { status: "declined" },
  );

  return withRequestDetails(GigRequest.findById(id));
}

function declineGigRequest(id) {
  return withRequestDetails(
    GigRequest.findByIdAndUpdate(id, { status: "declined" }, { new: true }),
  );
}

function cancelGigRequest(id) {
  return withRequestDetails(
    GigRequest.findByIdAndUpdate(id, { status: "canceled" }, { new: true }),
  );
}

export default {
  createGigRequest,
  getGigRequests,
  findGigRequestById,
  acceptGigRequest,
  declineGigRequest,
  cancelGigRequest,
};
