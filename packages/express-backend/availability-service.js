import Availability from "./availability.js";

async function createAvailability({ bandId, start, end, notes }) {
  const s = new Date(start);
  const e = new Date(end);

  const conflict = await Availibility.findOne({
    bandId,
    status: { $in: ["available", "pending", "unavailable"] },
    start: { $lt: e },
    end: { $gt: s },
  });

  if (conflict) throw new Error("Availibility overlaps existing time slot");

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

  return Availibility.find(query).sort({ start: 1 });
}

export default {
  createAvailability,
  getSlots,
};
