import Availability from "./availability.js";

async function createAvailability({ bandId, start, end, notes }) {
  const s = new Date(start);
  const e = new Date(end);

  const conflict = await Availability.findOne({
    bandId,
    status: { $in: ["available", "pending", "unavailable"] },
    start: { $lt: e },
    end: { $gt: s },
  });

  if (conflict) throw new Error("Availability overlaps existing time slot");

  return Availability.create({
    bandId,
    start: s,
    end: e,
    notes,
    status: "open",
  });
}

async function getSlots({ bandId, startime, endtime, status = "open" }) {
  const query = { bandId };
  if (status) query.status = status;

  if (startime || endtime) {
    query.start = {};
    if (startime) query.start.$gte = new Date(startime);
    if (endtime) query.start.$lte = new Date(endtime);
  }

  return Availability.find(query).sort({ start: 1 });
}

async function getSlotById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid availability ID");
  }

  return Availability.findById(id);
}

async function updateAvailability(id, updates) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid availability ID");
  }

  const existing = await Availability.findById(id);

  if (!existing) {
    return null;
  }

  const newStart = updates.start ? new Date(updates.start) : existing.start;
  const newEnd = updates.end ? new Date(updates.end) : existing.end;

  if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
    throw new Error("Invalid start or end date");
  }

  if (newEnd <= newStart) {
    throw new Error("End time must be after start time");
  }

  const conflict = await Availability.findOne({
    _id: { $ne: id },
    bandId: existing.bandId,
    status: { $in: ["available", "pending", "unavailable"] },
    start: { $lt: newEnd },
    end: { $gt: newStart },
  });

  if (conflict) {
    throw new Error("Updated availability overlaps existing time slot");
  }

  if (updates.start) existing.start = newStart;
  if (updates.end) existing.end = newEnd;
  if (updates.notes !== undefined) existing.notes = updates.notes;
  if (updates.status) existing.status = updates.status;

  return existing.save();
}

async function deleteAvailability(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid availability ID");
  }

  return Availability.findByIdAndDelete(id);
}

export default {
  createAvailability,
  getSlots,
  getSlotById,
  updateAvailability,
  deleteAvailability,
};
