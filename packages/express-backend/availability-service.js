import Availability from "./availability.js";

async function createAvailability({
  ownerType,
  ownerId,
  start,
  end,
  status = "available",
  notes = "",
}) {
  const s = new Date(start);
  const e = new Date(end);

  const conflict = await Availability.findOne({
    ownerType,
    ownerId,
    status: { $in: ["available", "unavailable", "pending", "booked"] },
    start: { $lt: e },
    end: { $gt: s },
  });

  if (conflict) {
    throw new Error("Availability overlaps existing time slot");
  }

  return Availability.create({
    ownerType,
    ownerId,
    start: s,
    end: e,
    status,
    notes,
  });
}

async function getSlots({ ownerType, ownerId, start, end, status }) {
  const query = { ownerType, ownerId };

  if (status) {
    query.status = status;
  }

  if (start || end) {
    query.start = {};
    if (start) query.start.$gte = new Date(start);
    if (end) query.start.$lte = new Date(end);
  }

  return Availability.find(query).sort({ start: 1 });
}

async function deleteAvailability(id) {
  return Availability.findByIdAndDelete(id);
}

export default {
  createAvailability,
  getSlots,
  deleteAvailability,
};