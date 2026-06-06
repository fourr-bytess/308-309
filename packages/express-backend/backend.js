import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bandServices from "./band-services.js";
import venueServices from "./venue-services.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import musicianServices from "./musician-services.js";
import reviewServices from "./review-services.js";
import gigServices from "./gig-services.js";
import authServices from "./auth-services.js";
import { VALID_ROLES } from "./user.js";
import notificationServices from "./notification-services.js";
import conversationServices from "./conversation-services.js";
import messageServices from "./message-services.js";
import emailVerificationServices from "./email-verification-services.js";
import availabilityService from "./availability-service.js";
import gigRequestServices from "./gig-request-services.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      const allowedStaticOrigins = [
        "https://witty-mud-06aba3e10.7.azurestaticapps.net",
      ];
      if (
        !origin ||
        allowedStaticOrigins.includes(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        callback(null, origin || true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

const uploadsRoot = path.join(__dirname, "uploads");
const musiciansUploads = path.join(uploadsRoot, "musicians");
const bandsUploads = path.join(uploadsRoot, "bands");
const bandGalleryUploads = path.join(uploadsRoot, "band-gallery");
fs.mkdirSync(musiciansUploads, { recursive: true });
fs.mkdirSync(bandsUploads, { recursive: true });
fs.mkdirSync(bandGalleryUploads, { recursive: true });

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const uploadStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    if (req.path.includes("/musicians/")) {
      cb(null, musiciansUploads);
      return;
    }
    if (req.path.includes("/gallery")) {
      cb(null, bandGalleryUploads);
      return;
    }
    cb(null, bandsUploads);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const imageUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

app.use("/uploads", express.static(uploadsRoot));

function makeUploadedImageUrl(req, folder, filename) {
  return `${req.protocol}://${req.get("host")}/uploads/${folder}/${filename}`;
}

function isValidEmail(email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function isEmailVerificationBypassEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  return (
    process.env.EMAIL_VERIFICATION_BYPASS === "true" ||
    process.env.EMAIL_VERIFICATION_BYPASS === "1"
  );
}

function extractBearerToken(req) {
  const header = req.get
    ? req.get("authorization")
    : req.headers?.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

function requireAuth(handler) {
  return async (req, res) => {
    if (process.env.NODE_ENV === "test") {
      return handler(req, res);
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json({ error: "Missing or invalid Authorization header" });
    }

    try {
      const payload = authServices.verifyAccessToken(token);
      req.auth = payload;
      return handler(req, res);
    } catch (_err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

function requireAuthWith(middlewares, handler) {
  const list = Array.isArray(middlewares) ? middlewares.filter(Boolean) : [];
  return requireAuth(async (req, res) => {
    let idx = 0;
    const run = () =>
      new Promise((resolve) => {
        const mw = list[idx];
        idx += 1;
        if (!mw) return resolve(true);
        mw(req, res, () => resolve(run()));
      });

    await run();
    if (res.headersSent) return;
    return handler(req, res);
  });
}

function requireRole(allowedRoles, handler) {
  return requireAuth(async (req, res) => {
    if (process.env.NODE_ENV === "test" && !req.auth) {
      return handler(req, res);
    }

    if (!allowedRoles.includes(req.auth?.role)) {
      return res.status(403).json({
        error: `This action requires one of these roles: ${allowedRoles.join(
          ", ",
        )}`,
      });
    }

    return handler(req, res);
  });
}

function getAuthUserId(req) {
  return String(req.auth?.sub || req.auth?.id || req.auth?._id || "");
}

function isConversationParticipant(conversation, userId) {
  if (!conversation) return false;
  return (
    String(conversation.bandUserId) === String(userId) ||
    String(conversation.venueUserId) === String(userId)
  );
}

function createInMemoryRateLimiter({ windowMs, max, keyFn }) {
  const hits = new Map();

  function cleanup(now) {
    for (const [key, entry] of hits.entries()) {
      if (!entry || now - entry.windowStartMs >= windowMs) {
        hits.delete(key);
      }
    }
  }

  return function rateLimit(req, res, next) {
    if (process.env.NODE_ENV === "test") return next();

    const now = Date.now();
    cleanup(now);

    const key = String(keyFn(req) || "");
    const existing = hits.get(key);

    if (!existing || now - existing.windowStartMs >= windowMs) {
      hits.set(key, { windowStartMs: now, count: 1 });
      return next();
    }

    existing.count += 1;
    if (existing.count > max) {
      return res.status(429).json({ error: "Too many requests" });
    }

    hits.set(key, existing);
    return next();
  };
}

function getRequestIp(req) {
  return (
    String(req.ip || "").trim() ||
    String(req.headers?.["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    String(req.socket?.remoteAddress || "").trim() ||
    "unknown"
  );
}

const authRateLimit = createInMemoryRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  keyFn: (req) =>
    `${getRequestIp(req)}:${String(req.path || "").toLowerCase()}`,
});

const messageSendRateLimit = createInMemoryRateLimiter({
  windowMs: 10 * 1000,
  max: 8,
  keyFn: (req) => {
    const userId = getAuthUserId(req) || "anon";
    return `${userId}:${String(req.path || "").toLowerCase()}`;
  },
});

const recentMessageFingerprint = new Map();
function passesBasicSpamChecks({ senderUserId, conversationId, text }) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return { ok: false, status: 400, error: "text is required" };
  }
  if (normalized.length > 2000) {
    return { ok: false, status: 400, error: "Message too long" };
  }

  const key = `${String(senderUserId)}:${String(conversationId)}`;
  const now = Date.now();
  const last = recentMessageFingerprint.get(key);
  const fingerprint = normalized.toLowerCase();

  // Cooldown: 1 msg/sec per conversation per user
  if (last?.lastSentMs && now - last.lastSentMs < 1000) {
    return {
      ok: false,
      status: 429,
      error: "You are sending messages too quickly",
    };
  }

  // Duplicate suppression: same message repeated within 10 seconds
  if (
    last?.lastFingerprint === fingerprint &&
    now - (last?.lastSentMs || 0) < 10_000
  ) {
    return { ok: false, status: 429, error: "Duplicate message detected" };
  }

  recentMessageFingerprint.set(key, {
    lastSentMs: now,
    lastFingerprint: fingerprint,
  });
  return { ok: true };
}

function getProfileLookupNameFromEmail(email) {
  return String(email || "")
    .split("@")[0]
    .trim()
    .toLowerCase();
}

function toAuthUserResponse(authUser) {
  return {
    id: String(authUser?.sub || authUser?.id || authUser?._id || ""),
    email: authUser?.email || "",
    display_name: authUser?.display_name || "",
    role: authUser?.role || "",
    email_verified: Boolean(authUser?.email_verified),
  };
}

async function resolveAuthUserFromDatabase(jwtPayload) {
  const userId = jwtPayload?.sub || jwtPayload?.id || jwtPayload?._id;
  if (!userId) {
    return jwtPayload;
  }

  const user = await authServices.findUserById(userId);
  if (!user) {
    return jwtPayload;
  }

  return {
    sub: String(user._id),
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    email_verified: Boolean(user.email_verified),
  };
}

async function issueTokenForEmail(email) {
  const user = await authServices.findUserByEmail(email);
  if (!user) {
    return null;
  }
  return authServices.createAccessToken(user);
}

function isOwnedByUser(document, authUserId) {
  return (
    Boolean(document?.owner_user) &&
    String(document.owner_user) === String(authUserId)
  );
}

async function resolveOwnedMusicianForAuth(authUser) {
  const authUserId = authUser?.sub || authUser?.id || authUser?._id;
  if (!authUserId) {
    return null;
  }

  const ownedMusician = await musicianServices.findOwnedMusicianByUserId(
    authUserId,
  );
  if (ownedMusician) {
    return ownedMusician;
  }

  const fallbackName = getProfileLookupNameFromEmail(authUser?.email);
  if (!fallbackName) {
    return null;
  }

  const unclaimedMusician = await musicianServices.findMusicianByName(
    fallbackName,
  );
  if (!unclaimedMusician || unclaimedMusician.owner_user) {
    return null;
  }

  return musicianServices.claimMusicianOwnership(
    unclaimedMusician._id,
    authUserId,
  );
}

async function resolveOwnedVenueForAuth(authUser) {
  const authUserId = authUser?.sub || authUser?.id || authUser?._id;
  if (!authUserId) {
    return null;
  }

  const ownedVenue = await venueServices.findOwnedVenueByUserId(authUserId);
  if (ownedVenue) {
    return ownedVenue;
  }

  const normalizedEmail = String(authUser?.email || "")
    .trim()
    .toLowerCase();
  if (normalizedEmail) {
    const venueByEmail = await venueServices.findVenueByContactEmail(
      normalizedEmail,
    );
    if (venueByEmail && !venueByEmail.owner_user) {
      return venueServices.claimVenueOwnership(venueByEmail._id, authUserId);
    }
    if (venueByEmail) {
      return null;
    }
  }

  const fallbackName = getProfileLookupNameFromEmail(authUser?.email);
  if (!fallbackName) {
    return null;
  }

  const venueByName = await venueServices.findVenueByName(fallbackName);
  if (!venueByName || venueByName.owner_user) {
    return null;
  }

  return venueServices.claimVenueOwnership(venueByName._id, authUserId);
}

async function getAuthProfiles(authUser) {
  const userRole = authUser?.role;
  const [ownedMusician, ownedVenue] = await Promise.all([
    userRole === "musician" || userRole === "band"
      ? resolveOwnedMusicianForAuth(authUser)
      : Promise.resolve(null),
    userRole === "venue"
      ? resolveOwnedVenueForAuth(authUser)
      : Promise.resolve(null),
  ]);

  return {
    musicianId: ownedMusician?._id ? String(ownedMusician._id) : "",
    venueId: ownedVenue?._id ? String(ownedVenue._id) : "",
  };
}
function canManageBandAdmins(band, authUserId) {
  const isAdmin =
    String(band.admin_user || band.owner_user || "") === String(authUserId);

  const isCoAdmin = (band.co_admin_users || []).some(
    (userId) => String(userId) === String(authUserId),
  );

  return isAdmin || isCoAdmin;
}

async function ensureBandAccess(req, res, bandId) {
  const band = await bandServices.findBandById(bandId);
  if (!band) {
    res.status(404).json({ error: "Band not found" });
    return null;
  }

  const authUserId = getAuthUserId(req);

  const isBandAdmin =
    String(band.admin_user || band.owner_user || "") === String(authUserId);

  const isBandCoAdmin = (band.co_admin_users || []).some(
    (userId) => String(userId) === String(authUserId),
  );

  if (isOwnedByUser(band, authUserId) || isBandAdmin || isBandCoAdmin) {
    return band;
  }

  const ownedMusician = await resolveOwnedMusicianForAuth(req.auth);
  const isBandMember =
    Boolean(ownedMusician) &&
    (band.members || []).some(
      (memberId) => String(memberId) === String(ownedMusician._id),
    );

  if (!isBandMember) {
    res
      .status(403)
      .json({ error: "You do not have permission to manage this band" });
    return null;
  }

  return band;
}

async function ensureVenueAccess(req, res, venueId) {
  const venue = await venueServices.findVenueById(venueId);
  if (!venue) {
    res.status(404).json({ error: "Venue not found" });
    return null;
  }

  if (!isOwnedByUser(venue, req.auth?.sub)) {
    res
      .status(403)
      .json({ error: "You do not have permission to manage this venue" });
    return null;
  }

  return venue;
}

async function ensureGigAccess(req, res, gigId) {
  const gig = await gigServices.findGigById(gigId);
  if (!gig) {
    res.status(404).json({ error: "Gig not found" });
    return null;
  }

  if (isOwnedByUser(gig, req.auth?.sub)) {
    return gig;
  }

  const ownedVenue = await resolveOwnedVenueForAuth(req.auth);
  if (!ownedVenue || String(gig.host) !== String(ownedVenue._id)) {
    res
      .status(403)
      .json({ error: "You do not have permission to manage this gig" });
    return null;
  }

  return gig;
}

async function ensureMusicianAccess(req, res, musicianId) {
  const musician = await musicianServices.findMusicianById(musicianId);
  if (!musician) {
    res.status(404).json({ error: "Musician not found" });
    return null;
  }

  if (!isOwnedByUser(musician, req.auth?.sub)) {
    res.status(403).json({
      error: "You do not have permission to manage this musician profile",
    });
    return null;
  }

  return musician;
}

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giggly")
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

app.post("/auth/register", authRateLimit, async (req, res) => {
  try {
    const { email, password, display_name, role } = req.body;

    if (!email || !password || !display_name || !role) {
      return res.status(400).json({
        error: "email, password, display_name, and role are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res
        .status(400)
        .json({ error: "role must be musician, band, or venue" });
    }

    const created = await authServices.registerUser({
      email,
      password,
      display_name,
      role,
    });

    try {
      await notificationServices.createNotification({
        userId: String(created.id || created._id),
        type: "welcome",
        title: "Welcome to Giggly",
        body: `Welcome to Giggly, ${created.display_name || display_name}!`,
        relatedId: String(created.id || created._id),
      });
    } catch (notificationErr) {
      console.error("Failed to create welcome notification:", notificationErr);
    }

    if (!isEmailVerificationBypassEnabled()) {
      try {
        await emailVerificationServices.sendVerificationForUser({
          userId: created._id,
          email: created.email,
        });
      } catch (verificationErr) {
        console.error("Failed to send verification email:", verificationErr);
      }
    }

    return res.status(201).json({
      data: {
        id: created._id,
        email: created.email,
        display_name: created.display_name,
        role: created.role,
        email_verified: Boolean(created.email_verified),
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(400).json({ error: "Failed to register user" });
  }
});

app.post("/auth/login", authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await authServices.authenticateUser({ email, password });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const authUser = {
      sub: String(user._id),
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      email_verified: Boolean(user.email_verified),
    };
    const profiles = await getAuthProfiles(authUser);
    const token = authServices.createAccessToken(user);
    return res.status(200).json({
      data: {
        token,
        user: toAuthUserResponse(authUser),
        profiles,
      },
    });
  } catch (_err) {
    return res.status(500).json({ error: "Failed to login" });
  }
});

app.get(
  "/auth/verify",
  requireAuth(async (req, res) => {
    const authUser = await resolveAuthUserFromDatabase(req.auth);
    const profiles = await getAuthProfiles(authUser);
    return res.status(200).json({
      data: {
        valid: true,
        user: toAuthUserResponse(authUser),
        profiles,
      },
    });
  }),
);

app.post("/auth/email/send", authRateLimit, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    if (isEmailVerificationBypassEnabled()) {
      return res.status(200).json({ data: { ok: true, bypassed: true } });
    }

    await emailVerificationServices.sendVerificationForEmail({ email });
    return res.status(200).json({ data: { ok: true } });
  } catch (_err) {
    return res.status(500).json({ error: "Failed to send verification code" });
  }
});

app.post("/auth/email/verify", authRateLimit, async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !isValidEmail(email) || !code) {
      return res.status(400).json({ error: "email and code are required" });
    }

    if (
      isEmailVerificationBypassEnabled() &&
      String(code).trim() === "000000"
    ) {
      await emailVerificationServices.devBypassVerifyEmail({ email });
      const token = await issueTokenForEmail(email);
      return res.status(200).json({
        data: { ok: true, bypassed: true, ...(token ? { token } : {}) },
      });
    }

    const result = await emailVerificationServices.verifyCodeForEmail({
      email,
      code,
    });

    if (!result.ok) {
      return res.status(400).json({ error: result.error || "Invalid code" });
    }

    const token = await issueTokenForEmail(email);
    return res.status(200).json({
      data: { ok: true, ...(token ? { token } : {}) },
    });
  } catch (_err) {
    return res.status(500).json({ error: "Failed to verify code" });
  }
});

app.get("/bands", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const minPrice =
      req.query.min_price !== undefined
        ? Number(req.query.min_price)
        : undefined;
    const maxPrice =
      req.query.max_price !== undefined
        ? Number(req.query.max_price)
        : undefined;
    const price_range =
      Number.isFinite(minPrice) && Number.isFinite(maxPrice)
        ? [minPrice, maxPrice]
        : undefined;

    const filters = {
      name: req.query.name,
      members: req.query.members?.split(","),
      genres: req.query.genres?.split(","),
      locations: req.query.locations?.split(","),
      price_range,
    };

    const total = await bandServices.getBandsCount(filters);
    const cappedLimit = Math.min(limit, 50);
    const { bands } = await bandServices.getBandsPaginated(
      cappedLimit,
      offset,
      filters,
    );
    res
      .status(200)
      .json({ data: bands, meta: { limit: cappedLimit, offset, total } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bands" });
  }
});

app.get("/bands/:id", async (req, res) => {
  try {
    const band = await bandServices.findBandById(req.params.id);
    if (!band) {
      return res.status(404).json({ error: "Band not found" });
    }
    res.status(200).json({ data: band });
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID" });
  }
});

app.get("/bands/:id/members", async (req, res) => {
  try {
    const band = await bandServices.findBandById(req.params.id);

    if (!band) {
      return res.status(404).json({ error: "Band not found" });
    }

    const memberDetails = await Promise.all(
      (band.members || []).map((memberId) =>
        musicianServices.findMusicianById(memberId),
      ),
    );

    return res.status(200).json({
      data: memberDetails.filter(Boolean).map((member) => ({
        _id: member._id,
        name: member.name,
        owner_user: member.owner_user,
      })),
    });
  } catch (err) {
    return res.status(400).json({ error: "Failed to fetch band members" });
  }
});

app.post(
  "/bands",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (process.env.NODE_ENV === "test" && !req.auth) {
        const created = await bandServices.addBand(req.body);
        return res.status(201).json({ data: created });
      }

      const ownedMusician = await resolveOwnedMusicianForAuth(req.auth);
      if (!ownedMusician) {
        return res
          .status(403)
          .json({ error: "Create a musician profile before creating bands" });
      }

      const memberIds = new Set(
        Array.isArray(req.body.members)
          ? req.body.members.map((memberId) => String(memberId))
          : [],
      );
      memberIds.add(String(ownedMusician._id));

      const created = await bandServices.addBand({
        ...req.body,
        owner_user: req.auth.sub,
        admin_user: req.auth.sub,
        co_admin_users: [],
        members: Array.from(memberIds),
      });
      res.status(201).json({ data: created });
    } catch (error) {
      res.status(400).json({ error: "Failed to create band" });
    }
  }),
);

app.post(
  "/bands/:id/members",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      const band = await bandServices.findBandById(req.params.id);

      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      if (!canManageBandAdmins(band, getAuthUserId(req))) {
        return res
          .status(403)
          .json({ error: "Only a band admin or co-admin can add members" });
      }

      const { musicianId, email } = req.body;

      let memberMusicianId = musicianId;

      if (!memberMusicianId && email) {
        const normalizedEmail = String(email).trim().toLowerCase();

        const musicianUser = await authServices.findUserByEmail(
          normalizedEmail,
        );

        if (!musicianUser) {
          return res
            .status(404)
            .json({ error: "No user found with that email" });
        }

        const musicianProfile =
          await musicianServices.findOwnedMusicianByUserId(musicianUser._id);

        if (!musicianProfile) {
          return res
            .status(404)
            .json({ error: "That user does not have a musician profile" });
        }

        memberMusicianId = musicianProfile._id;
      }

      if (!memberMusicianId) {
        return res
          .status(400)
          .json({ error: "musicianId or email is required" });
      }

      const updatedBand = await bandServices.addBandMember(
        req.params.id,
        memberMusicianId,
      );

      return res.status(200).json({ data: updatedBand });
    } catch (err) {
      return res.status(400).json({ error: "Failed to add band member" });
    }
  }),
);
app.put(
  "/bands/:id/co-admins/:musicianId",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      const band = await bandServices.findBandById(req.params.id);

      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      const authUserId = getAuthUserId(req);
      const isAdmin =
        String(band.admin_user || band.owner_user || "") === String(authUserId);

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Only the band admin can manage co-admins" });
      }

      const musician = await musicianServices.findMusicianById(
        req.params.musicianId,
      );

      if (!musician || !musician.owner_user) {
        return res
          .status(404)
          .json({ error: "That member does not have an owner user account" });
      }

      const updatedBand = await bandServices.addBandCoAdmin(
        req.params.id,
        musician.owner_user,
      );

      return res.status(200).json({ data: updatedBand });
    } catch (err) {
      return res.status(400).json({ error: "Failed to add co-admin" });
    }
  }),
);

app.delete(
  "/bands/:id/co-admins/:musicianId",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      const band = await bandServices.findBandById(req.params.id);

      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      const authUserId = getAuthUserId(req);
      const isAdmin =
        String(band.admin_user || band.owner_user || "") === String(authUserId);

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Only the band admin can manage co-admins" });
      }

      const musician = await musicianServices.findMusicianById(
        req.params.musicianId,
      );

      if (!musician || !musician.owner_user) {
        return res
          .status(404)
          .json({ error: "That member does not have an owner user account" });
      }

      const updatedBand = await bandServices.removeBandCoAdmin(
        req.params.id,
        musician.owner_user,
      );

      return res.status(200).json({ data: updatedBand });
    } catch (err) {
      return res.status(400).json({ error: "Failed to remove co-admin" });
    }
  }),
);

app.put(
  "/bands/:id/admin/:musicianId",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      const band = await bandServices.findBandById(req.params.id);

      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      const authUserId = getAuthUserId(req);
      const isAdmin =
        String(band.admin_user || band.owner_user || "") === String(authUserId);

      if (!isAdmin) {
        return res.status(403).json({
          error: "Only the current band admin can transfer admin rights",
        });
      }

      const musician = await musicianServices.findMusicianById(
        req.params.musicianId,
      );

      if (!musician || !musician.owner_user) {
        return res
          .status(404)
          .json({ error: "That member does not have an owner user account" });
      }

      const updatedBand = await bandServices.transferBandAdmin(
        req.params.id,
        musician.owner_user,
      );

      return res.status(200).json({ data: updatedBand });
    } catch (err) {
      return res.status(400).json({ error: "Failed to transfer admin rights" });
    }
  }),
);

app.delete(
  "/bands/:id/members/:musicianId",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      const band = await bandServices.findBandById(req.params.id);

      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      if (!canManageBandAdmins(band, getAuthUserId(req))) {
        return res
          .status(403)
          .json({ error: "Only a band admin or co-admin can remove members" });
      }

      const adminMusician = await resolveOwnedMusicianForAuth(req.auth);

      if (String(req.params.musicianId) === String(adminMusician?._id)) {
        return res
          .status(400)
          .json({ error: "Band admin cannot remove themselves" });
      }

      const updatedBand = await bandServices.removeBandMember(
        req.params.id,
        req.params.musicianId,
      );

      return res.status(200).json({ data: updatedBand });
    } catch (err) {
      return res.status(400).json({ error: "Failed to remove band member" });
    }
  }),
);

app.delete(
  "/bands/:id",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (process.env.NODE_ENV === "test" && !req.auth) {
        const deleted = await bandServices.findBandByIdAndDelete(req.params.id);
        if (!deleted) {
          return res.status(404).json({ error: "Band not found" });
        }
        return res.status(200).json({ data: deleted });
      }

      if (!(await ensureBandAccess(req, res, req.params.id))) {
        return;
      }
      const deleted = await bandServices.findBandByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Band not found" });
      }
      res.status(200).json({ data: deleted });
    } catch (err) {
      return res.status(404).json({ error: "Invalid ID" });
    }
  }),
);

app.post(
  "/bands/:id/profile-picture",
  requireRole(["musician", "band"], async (req, res) => {
    if (!(await ensureBandAccess(req, res, req.params.id))) {
      return;
    }
    imageUpload.single("image")(req, res, async (uploadErr) => {
      if (uploadErr) {
        if (
          uploadErr instanceof multer.MulterError &&
          uploadErr.code === "LIMIT_FILE_SIZE"
        ) {
          return res
            .status(400)
            .json({ error: "Image must be 5MB or smaller" });
        }
        return res
          .status(400)
          .json({ error: uploadErr.message || "Upload failed" });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: "Image file is required" });
        }
        const imageUrl = makeUploadedImageUrl(req, "bands", req.file.filename);
        const updatedBand = await bandServices.updateBandProfilePicture(
          req.params.id,
          imageUrl,
        );
        if (!updatedBand) {
          return res.status(404).json({ error: "Band not found" });
        }
        res.status(200).json({ data: updatedBand });
      } catch (err) {
        res
          .status(400)
          .json({ error: "Failed to upload band profile picture" });
      }
    });
  }),
);

app.post(
  "/bands/:id/gallery",
  requireRole(["musician", "band"], async (req, res) => {
    if (!(await ensureBandAccess(req, res, req.params.id))) {
      return;
    }
    imageUpload.single("image")(req, res, async (uploadErr) => {
      if (uploadErr) {
        if (
          uploadErr instanceof multer.MulterError &&
          uploadErr.code === "LIMIT_FILE_SIZE"
        ) {
          return res
            .status(400)
            .json({ error: "Image must be 5MB or smaller" });
        }
        return res
          .status(400)
          .json({ error: uploadErr.message || "Upload failed" });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: "Image file is required" });
        }
        const imageUrl = makeUploadedImageUrl(
          req,
          "band-gallery",
          req.file.filename,
        );
        const updatedBand = await bandServices.addBandGalleryImage(
          req.params.id,
          imageUrl,
        );
        if (!updatedBand) {
          return res.status(404).json({ error: "Band not found" });
        }
        res.status(200).json({ data: updatedBand });
      } catch (err) {
        res.status(400).json({ error: "Failed to upload band gallery image" });
      }
    });
  }),
);

app.delete(
  "/bands/:id/gallery",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (!(await ensureBandAccess(req, res, req.params.id))) {
        return;
      }
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }
      const updatedBand = await bandServices.removeBandGalleryImage(
        req.params.id,
        imageUrl,
      );
      if (!updatedBand) {
        return res.status(404).json({ error: "Band not found" });
      }
      res.status(200).json({ data: updatedBand });
    } catch (err) {
      res.status(400).json({ error: "Failed to remove band gallery image" });
    }
  }),
);

app.post(
  "/bands/:id",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (!(await ensureBandAccess(req, res, req.params.id))) {
        return;
      }
      const { videoUrl } = req.body;
      const videoId = String(videoUrl || "").match(
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n]+)/,
      )?.[1];
      if (!videoId) return res.status(400).json({ error: "Invalid URL" });
      const updatedBand = await bandServices.addBandVideo(
        req.params.id,
        videoId,
      );
      res.status(200).json({ data: updatedBand });
    } catch (err) {
      res.status(400).json({ error: "Failed to upload video" });
    }
  }),
);

app.delete(
  "/bands/:id/videos/:videoId",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (!(await ensureBandAccess(req, res, req.params.id))) {
        return;
      }
      const { id, videoId } = req.params;

      const updated = await bandServices.removeBandVideo(id, videoId);

      if (!updated) {
        return res.status(404).json({ error: "Band not found" });
      }

      res.status(200).json({ data: updated });
    } catch (err) {
      console.error("Delete Error:", err);
      res.status(400).json({ error: "Failed to delete video" });
    }
  }),
);

//GET /venues

app.get("/venues", async (req, res) => {
  try {
    const { name, city, state, zip, contact_email } = req.query;

    const minCap =
      req.query.minCap !== undefined ? Number(req.query.minCap) : undefined;
    const maxCap =
      req.query.maxCap !== undefined ? Number(req.query.maxCap) : undefined;

    const capacity_range =
      Number.isFinite(minCap) && Number.isFinite(maxCap)
        ? [minCap, maxCap]
        : undefined;

    const venues = await venueServices.getVenue(
      name,
      city,
      state,
      zip,
      capacity_range,
      contact_email,
    );

    res.json({ data: venues });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

// POST /venues
app.post(
  "/venues",
  requireRole(["venue"], async (req, res) => {
    try {
      if (process.env.NODE_ENV === "test" && !req.auth) {
        const created = await venueServices.addVenue(req.body);
        return res.status(201).json({ data: created });
      }

      const existingVenue = await resolveOwnedVenueForAuth(req.auth);
      if (existingVenue) {
        return res.status(200).json({ data: existingVenue });
      }

      const created = await venueServices.addVenue({
        ...req.body,
        owner_user: req.auth.sub,
        contact_email: String(req.auth.email || req.body.contact_email || "")
          .trim()
          .toLowerCase(),
      });
      res.status(201).json({ data: created });
    } catch (err) {
      res.status(400).json({ error: "Failed to create venue" });
    }
  }),
);

// GET /venues/:id ...

app.get("/venues/:id", async (req, res) => {
  try {
    const venue = await venueServices.findVenueById(req.params.id);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }
    res.json({ data: venue });
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID" });
  }
});

// DELETE /venues/:id
app.delete(
  "/venues/:id",
  requireRole(["venue"], async (req, res) => {
    try {
      if (process.env.NODE_ENV === "test" && !req.auth) {
        const deleted = await venueServices.findVenueByIdAndDelete(
          req.params.id,
        );
        if (!deleted) {
          return res.status(404).json({ error: "Venue not found" });
        }
        return res.json({ data: deleted });
      }

      if (!(await ensureVenueAccess(req, res, req.params.id))) {
        return;
      }
      const deleted = await venueServices.findVenueByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Venue not found" });
      }
      res.json({ data: deleted });
    } catch (err) {
      return res.status(400).json({ error: "Invalid ID" });
    }
  }),
);

// GET /gigs ...

app.get("/gigs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const cappedLimit = Math.min(limit, 50);

    const minPrice =
      req.query.min_price !== undefined
        ? Number(req.query.min_price)
        : undefined;
    const maxPrice =
      req.query.max_price !== undefined
        ? Number(req.query.max_price)
        : undefined;
    const price_range =
      Number.isFinite(minPrice) && Number.isFinite(maxPrice)
        ? [minPrice, maxPrice]
        : undefined;

    const filters = {
      name: req.query.name,
      description: req.query.description,
      genres: req.query.genres?.split(","),
      location: req.query.location,
      price_range,
      host: req.query.host,
      booked:
        req.query.booked === "true"
          ? true
          : req.query.booked === "false"
          ? false
          : undefined,
    };

    const total = await gigServices.getGigsCount(filters);
    const { gigs } = await gigServices.getGigsPaginated(
      cappedLimit,
      offset,
      filters,
    );
    res
      .status(200)
      .json({ data: gigs, meta: { limit: cappedLimit, offset, total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gigs" });
  }
});

// GET /gigs/:id ...

app.get("/gigs/:id", async (req, res) => {
  try {
    const gig = await gigServices.findGigById(req.params.id);
    if (!gig) {
      return res.status(404).json({ error: "Gig not found" });
    }
    res.status(200).json({ data: gig });
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID" });
  }
});

// POST /gigs
app.post(
  "/gigs",
  requireRole(["venue"], async (req, res) => {
    try {
      const ownedVenue = await resolveOwnedVenueForAuth(req.auth);
      if (!ownedVenue) {
        return res
          .status(403)
          .json({ error: "Create a venue profile before creating gigs" });
      }

      const created = await gigServices.addGig({
        ...req.body,
        host: ownedVenue._id,
        owner_user: req.auth.sub,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      console.error("Failed to create gig:", err);
      res.status(400).json({ error: err.message || "Failed to create gig" });
    }
  }),
);

// DELETE /gigs/:id
app.delete(
  "/gigs/:id",
  requireRole(["venue"], async (req, res) => {
    try {
      if (!(await ensureGigAccess(req, res, req.params.id))) {
        return;
      }
      const deleted = await gigServices.findGigByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Gig not found" });
      }
      res.status(200).json({ data: deleted });
    } catch (err) {
      return res.status(400).json({ error: "Invalid ID" });
    }
  }),
);

// GET /musicians ...

app.get("/musicians", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const cappedLimit = Math.min(limit, 50);

    const filters = {
      name: req.query.name,
      instruments: req.query.instruments?.split(","),
      band_affiliations: req.query.band_affiliations?.split(","),
    };

    const total = await musicianServices.getMusiciansCount(filters);
    const { musicians } = await musicianServices.getMusiciansPaginated(
      cappedLimit,
      offset,
      filters,
    );

    res
      .status(200)
      .json({ data: musicians, meta: { limit: cappedLimit, offset, total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch musicians" });
  }
});

app.put("/gigs/:id", async (req, res) => {
  try {
    const gigId = req.params.id;
    const updateData = req.body;

    if (updateData.name) updateData.name = updateData.name.toLowerCase();

    const updatedGig = await gigServices.updateGigProfile(gigId, updateData);

    if (!updatedGig) {
      return res.status(404).json({ error: "Gig profile not found." });
    }

    res.status(200).json({ data: updatedGig });
  } catch (err) {
    res
      .status(400)
      .json({ error: err.message || "Failed to update gig details" });
  }
});

app.post("/gigs/:id/gallery", async (req, res) => {
  imageUpload.single("image")(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (
        uploadErr instanceof multer.MulterError &&
        uploadErr.code === "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({ error: "Image must be 5MB or smaller" });
      }
      return res
        .status(400)
        .json({ error: uploadErr.message || "Upload failed" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      const imageUrl = makeUploadedImageUrl(
        req,
        "band-gallery",
        req.file.filename,
      );

      const updatedGig = await gigServices.addGigGalleryImage(
        req.params.id,
        imageUrl,
      );

      if (!updatedGig) {
        return res.status(404).json({ error: "Gig not found" });
      }
      res.status(200).json({ data: updatedGig });
    } catch (err) {
      res.status(400).json({ error: "Failed to upload gig gallery image" });
    }
  });
});

app.delete("/gigs/:id/gallery", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    const updatedGig = await gigServices.removeGigGalleryImage(
      req.params.id,
      imageUrl,
    );

    if (!updatedGig) {
      return res.status(404).json({ error: "Gig not found" });
    }
    res.status(200).json({ data: updatedGig });
  } catch (err) {
    res.status(400).json({ error: "Failed to remove gig gallery image" });
  }
});

app.get("/musicians/:id", async (req, res) => {
  try {
    const musician = await musicianServices.findMusicianById(req.params.id);
    if (!musician) {
      return res.status(404).json({ error: "Musician not found" });
    }
    res.status(200).json({ data: musician });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

app.post(
  "/musicians",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (process.env.NODE_ENV === "test" && !req.auth) {
        const created = await musicianServices.addMusician(req.body);
        return res.status(201).json({ data: created });
      }

      const existingMusician = await resolveOwnedMusicianForAuth(req.auth);
      if (existingMusician) {
        return res.status(200).json({ data: existingMusician });
      }

      const created = await musicianServices.addMusician({
        ...req.body,
        owner_user: req.auth.sub,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      res.status(400).json({ error: "Failed to create musician" });
    }
  }),
);

// DELETE /musicians/:id
app.delete(
  "/musicians/:id",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (process.env.NODE_ENV === "test" && !req.auth) {
        const deleted = await musicianServices.findMusicianByIdAndDelete(
          req.params.id,
        );
        if (!deleted) {
          return res.status(404).json({ error: "Musician not found" });
        }
        return res.status(200).json({ data: deleted });
      }

      if (!(await ensureMusicianAccess(req, res, req.params.id))) {
        return;
      }
      const deleted = await musicianServices.findMusicianByIdAndDelete(
        req.params.id,
      );
      if (!deleted) {
        return res.status(404).json({ error: "Musician not found" });
      }
      res.status(200).json({ data: deleted });
    } catch (err) {
      res.status(400).json({ error: "Invalid ID" });
    }
  }),
);

app.post(
  "/musicians/:id/profile-picture",
  requireRole(["musician", "band"], async (req, res) => {
    if (!(await ensureMusicianAccess(req, res, req.params.id))) {
      return;
    }
    imageUpload.single("image")(req, res, async (uploadErr) => {
      if (uploadErr) {
        if (
          uploadErr instanceof multer.MulterError &&
          uploadErr.code === "LIMIT_FILE_SIZE"
        ) {
          return res
            .status(400)
            .json({ error: "Image must be 5MB or smaller" });
        }
        return res
          .status(400)
          .json({ error: uploadErr.message || "Upload failed" });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: "Image file is required" });
        }
        const imageUrl = makeUploadedImageUrl(
          req,
          "musicians",
          req.file.filename,
        );
        const updatedMusician =
          await musicianServices.updateMusicianProfilePicture(
            req.params.id,
            imageUrl,
          );
        if (!updatedMusician) {
          return res.status(404).json({ error: "Musician not found" });
        }
        res.status(200).json({ data: updatedMusician });
      } catch (err) {
        res
          .status(400)
          .json({ error: "Failed to upload musician profile picture" });
      }
    });
  }),
);

app.put(
  "/musicians/:id",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (!(await ensureMusicianAccess(req, res, req.params.id))) {
        return;
      }

      const { name, bio } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (bio !== undefined) updates.bio = bio;

      const updatedMusician = await musicianServices.updateMusicianProfile(
        req.params.id,
        updates,
      );

      if (!updatedMusician) {
        return res.status(404).json({ error: "Musician profile not found" });
      }

      res.status(200).json({ data: updatedMusician });
    } catch (err) {
      res.status(400).json({ error: "Failed to update musician profile" });
    }
  }),
);

app.post(
  "/musicians/:id/gallery",
  requireRole(["musician", "band"], async (req, res) => {
    if (!(await ensureMusicianAccess(req, res, req.params.id))) {
      return;
    }
    imageUpload.single("image")(req, res, async (uploadErr) => {
      if (uploadErr) {
        if (
          uploadErr instanceof multer.MulterError &&
          uploadErr.code === "LIMIT_FILE_SIZE"
        ) {
          return res
            .status(400)
            .json({ error: "Image must be 5MB or smaller" });
        }
        return res
          .status(400)
          .json({ error: uploadErr.message || "Upload failed" });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: "Image file is required" });
        }
        const imageUrl = makeUploadedImageUrl(
          req,
          "musicians",
          req.file.filename,
        );

        const updatedMusician = await musicianServices.addMusicianGalleryImage(
          req.params.id,
          imageUrl,
        );
        if (!updatedMusician) {
          return res.status(404).json({ error: "Musician not found" });
        }
        res.status(200).json({ data: updatedMusician });
      } catch (err) {
        res.status(400).json({ error: "Failed to upload gallery image" });
      }
    });
  }),
);

app.delete(
  "/musicians/:id/gallery",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (!(await ensureMusicianAccess(req, res, req.params.id))) {
        return;
      }
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      const updatedMusician = await musicianServices.removeMusicianGalleryImage(
        req.params.id,
        imageUrl,
      );
      if (!updatedMusician) {
        return res.status(404).json({ error: "Musician not found" });
      }
      res.status(200).json({ data: updatedMusician });
    } catch (err) {
      res
        .status(400)
        .json({ error: "Failed to remove musician gallery image" });
    }
  }),
);

app.post(
  "/musicians/:id/videos",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (!(await ensureMusicianAccess(req, res, req.params.id))) {
        return;
      }
      const { videoUrl } = req.body;
      const videoId = String(videoUrl || "").match(
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n]+)/,
      )?.[1];
      if (!videoId) return res.status(400).json({ error: "Invalid URL" });
      const updatedMusician = await musicianServices.addMusicianVideo(
        req.params.id,
        videoId,
      );
      res.status(200).json({ data: updatedMusician });
    } catch (err) {
      res.status(400).json({ error: "Failed to upload video" });
    }
  }),
);

app.delete(
  "/musicians/:id/videos/:videoId",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      if (!(await ensureMusicianAccess(req, res, req.params.id))) {
        return;
      }
      const { id, videoId } = req.params;
      const updated = await musicianServices.removeMusicianVideo(id, videoId);
      if (!updated) {
        return res.status(404).json({ error: "Musician not found" });
      }
      res.status(200).json({ data: updated });
    } catch (err) {
      res.status(400).json({ error: "Failed to delete video" });
    }
  }),
);

app.get("/musicians/:id/reviews", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const cappedLimit = Math.min(limit, 50);

    const filters = { reviewee: req.params.id, revieweeType: "Musician" };
    const total = await reviewServices.getReviewsCount(filters);
    const { reviews } = await reviewServices.getReviewsPaginated(
      cappedLimit,
      offset,
      filters,
    );

    res
      .status(200)
      .json({ data: reviews, meta: { limit: cappedLimit, offset, total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// GET /reviews ...

app.get("/reviews", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const cappedLimit = Math.min(limit, 50);

    const filters = {
      reviewee: req.query.reviewee,
      reviewer: req.query.reviewer,
      revieweeType: req.query.revieweeType,
      rating: req.query.rating,
      header: req.query.header,
      body: req.query.body,
    };

    const total = await reviewServices.getReviewsCount(filters);
    const { reviews } = await reviewServices.getReviewsPaginated(
      cappedLimit,
      offset,
      filters,
    );
    res
      .status(200)
      .json({ data: reviews, meta: { limit: cappedLimit, offset, total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST /reviews
app.post(
  "/reviews",
  requireAuth(async (req, res) => {
    try {
      const { reviewer, reviewee, revieweeType, rating, header, body } =
        req.body;
      if (
        reviewer == null ||
        reviewee == null ||
        revieweeType == null ||
        rating == null
      ) {
        return res.status(400).json({
          error: "reviewer, reviewee, revieweeType, and rating are required",
        });
      }

      const ratingNum = Number(rating);
      if (!Number.isFinite(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        return res
          .status(400)
          .json({ error: "rating must be a number between 0 and 5" });
      }

      const validTypes = ["Band", "Venue", "Musician"];
      if (!validTypes.includes(revieweeType)) {
        return res
          .status(400)
          .json({ error: "revieweeType must be Band, Venue, or Musician" });
      }

      const created = await reviewServices.addReview({
        reviewer,
        reviewee,
        revieweeType,
        rating: ratingNum,
        header: header || undefined,
        body: body || undefined,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      res.status(400).json({ error: "Failed to create review" });
    }
  }),
);

app.get("/notifications", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const notifications = await notificationServices.getNotificationsByUser(
      userId,
    );

    res.status(200).json({ data: notifications });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.get("/notifications/unread-count", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const count = await notificationServices.getUnreadCount(userId);

    res.status(200).json({ data: { count } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

app.post("/notifications", async (req, res) => {
  try {
    const { userId, type, title, body, relatedId } = req.body;

    if (!userId || !type || !title) {
      return res.status(400).json({
        error: "userId, type, and title are required",
      });
    }

    const notification = await notificationServices.createNotification({
      userId,
      type,
      title,
      body,
      relatedId,
    });

    res.status(201).json({ data: notification });
  } catch (err) {
    res.status(400).json({ error: "Failed to create notification" });
  }
});

app.put("/notifications/:id/read", async (req, res) => {
  try {
    const notification = await notificationServices.markNotificationAsRead(
      req.params.id,
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json({ data: notification });
  } catch (err) {
    res.status(400).json({ error: "Failed to mark notification as read" });
  }
});

app.put("/notifications/read-all", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    await notificationServices.markAllNotificationsAsRead(userId);

    res.status(200).json({ data: { success: true } });
  } catch (err) {
    res.status(400).json({ error: "Failed to mark notifications as read" });
  }
});

app.delete("/notifications/:id", async (req, res) => {
  try {
    const deleted = await notificationServices.deleteNotification(
      req.params.id,
    );

    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json({ data: deleted });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete notification" });
  }
});

app.get(
  "/conversations",
  requireAuth(async (req, res) => {
    try {
      const authUserId = getAuthUserId(req);
      const requestedUserId = req.query?.userId ? String(req.query.userId) : "";
      if (requestedUserId && requestedUserId !== authUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const conversations = await conversationServices.getConversationsByUser(
        String(authUserId),
      );

      res.status(200).json({ data: conversations });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  }),
);

app.post(
  "/conversations",
  requireAuth(async (req, res) => {
    try {
      const { gigId, bandId, venueId, bandUserId, venueUserId } = req.body;

      if (!bandId || !venueId || !bandUserId || !venueUserId) {
        return res.status(400).json({
          error: "bandId, venueId, bandUserId, and venueUserId are required",
        });
      }

      const authUserId = getAuthUserId(req);
      if (
        String(bandUserId) !== String(authUserId) &&
        String(venueUserId) !== String(authUserId)
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const existing =
        await conversationServices.findConversationByParticipants({
          gigId,
          bandId,
          venueId,
          bandUserId: String(bandUserId),
          venueUserId: String(venueUserId),
        });

      if (existing) {
        return res.status(200).json({ data: existing });
      }

      const conversation = await conversationServices.addConversation({
        gigId,
        bandId,
        venueId,
        bandUserId: String(bandUserId),
        venueUserId: String(venueUserId),
      });

      res.status(201).json({ data: conversation });
    } catch (err) {
      console.error("Failed to create conversation:", err);
      res.status(400).json({
        error: err.message || "Failed to create conversation",
      });
    }
  }),
);

app.get(
  "/conversations/:id/messages",
  requireAuth(async (req, res) => {
    try {
      const authUserId = getAuthUserId(req);
      const conversation = await conversationServices.findConversationById(
        req.params.id,
      );

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (!isConversationParticipant(conversation, authUserId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const messages = await messageServices.getMessages(req.params.id);
      res.status(200).json({ data: messages });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }),
);

app.post(
  "/conversations/:id/messages",
  requireAuthWith([messageSendRateLimit], async (req, res) => {
    try {
      const authUserId = getAuthUserId(req);
      const { text } = req.body || {};

      const conversation = await conversationServices.findConversationById(
        req.params.id,
      );

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (!isConversationParticipant(conversation, authUserId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const senderRole =
        String(conversation.bandUserId) === String(authUserId)
          ? "band"
          : "venue";

      const spamCheck = passesBasicSpamChecks({
        senderUserId: authUserId,
        conversationId: req.params.id,
        text,
      });
      if (!spamCheck.ok) {
        return res
          .status(spamCheck.status || 429)
          .json({ error: spamCheck.error || "Blocked" });
      }

      const message = await messageServices.addMessage({
        conversationId: req.params.id,
        senderUserId: String(authUserId),
        senderRole,
        text,
        readByUserIds: [String(authUserId)],
      });

      await conversationServices.updateConversationLastMessage(
        req.params.id,
        text,
      );

      const receiverUserId =
        String(authUserId) === String(conversation.bandUserId)
          ? String(conversation.venueUserId)
          : String(conversation.bandUserId);

      await notificationServices.createNotification({
        userId: receiverUserId,
        type: "message",
        title: "New message",
        body: "You have a new message.",
        relatedId: String(conversation._id),
      });

      res.status(201).json({ data: message });
    } catch (err) {
      res.status(400).json({ error: "Failed to send message" });
    }
  }),
);

app.put(
  "/conversations/:id/read",
  requireAuth(async (req, res) => {
    try {
      const authUserId = getAuthUserId(req);

      const conversation = await conversationServices.findConversationById(
        req.params.id,
      );
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (!isConversationParticipant(conversation, authUserId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await messageServices.markMessagesRead(req.params.id, String(authUserId));

      res.status(200).json({ data: { success: true } });
    } catch (err) {
      res.status(400).json({ error: "Failed to mark conversation as read" });
    }
  }),
);

app.delete(
  "/conversations/:id",
  requireAuth(async (req, res) => {
    try {
      const authUserId = getAuthUserId(req);
      const conversation = await conversationServices.findConversationById(
        req.params.id,
      );
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (!isConversationParticipant(conversation, authUserId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const deleted = await conversationServices.findConversationByIdAndDelete(
        req.params.id,
      );

      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.status(200).json({ data: deleted });
    } catch (err) {
      res.status(400).json({ error: "Failed to delete conversation" });
    }
  }),
);

app.get(
  "/gig-requests",
  requireAuth(async (req, res) => {
    try {
      const authUserId = getAuthUserId(req);
      const filters = {
        gigId: req.query.gigId,
        bandId: req.query.bandId,
        venueId: req.query.venueId,
        status: req.query.status,
      };

      if (req.auth?.role === "venue") {
        filters.venueUserId = authUserId;
      } else {
        filters.bandUserId = authUserId;
      }

      const requests = await gigRequestServices.getGigRequests(filters);
      res.status(200).json({ data: requests });
    } catch (err) {
      console.error("Failed to fetch gig requests:", err);
      res.status(500).json({ error: "Failed to fetch gig requests" });
    }
  }),
);

app.post(
  "/gig-requests",
  requireRole(["musician", "band"], async (req, res) => {
    try {
      const { gigId, bandId, venueId, venueUserId } = req.body;

      if (!gigId || !bandId || !venueId || !venueUserId) {
        return res.status(400).json({
          error: "gigId, bandId, venueId, and venueUserId are required",
        });
      }

      const band = await ensureBandAccess(req, res, bandId);
      if (!band) return;

      const gig = await gigServices.findGigById(gigId);
      if (!gig) {
        return res.status(404).json({ error: "Gig not found" });
      }
      if (gig.booked) {
        return res.status(400).json({ error: "This gig is already booked" });
      }
      if (String(gig.host) !== String(venueId)) {
        return res.status(400).json({ error: "Gig does not belong to venue" });
      }

      const request = await gigRequestServices.createGigRequest({
        gigId,
        bandId,
        venueId,
        bandUserId: getAuthUserId(req),
        venueUserId: String(venueUserId),
      });

      await notificationServices.createNotification({
        userId: String(venueUserId),
        type: "booking-request",
        title: "New gig request",
        body: `${band.name} requested your gig.`,
        relatedId: String(request._id),
      });

      res.status(201).json({ data: request });
    } catch (err) {
      res
        .status(400)
        .json({ error: err.message || "Failed to create gig request" });
    }
  }),
);

app.put(
  "/gig-requests/:id/accept",
  requireRole(["venue"], async (req, res) => {
    try {
      const existing = await gigRequestServices.findGigRequestById(
        req.params.id,
      );
      if (!existing) {
        return res.status(404).json({ error: "Gig request not found" });
      }
      if (String(existing.venueUserId) !== getAuthUserId(req)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const request = await gigRequestServices.acceptGigRequest(req.params.id);

      await notificationServices.createNotification({
        userId: String(request.bandUserId),
        type: "gig-booked",
        title: "Gig request accepted",
        body: "Your gig request was accepted.",
        relatedId: String(request._id),
      });

      res.status(200).json({ data: request });
    } catch (err) {
      res.status(400).json({ error: "Failed to accept gig request" });
    }
  }),
);

app.put(
  "/gig-requests/:id/decline",
  requireRole(["venue"], async (req, res) => {
    try {
      const existing = await gigRequestServices.findGigRequestById(
        req.params.id,
      );
      if (!existing) {
        return res.status(404).json({ error: "Gig request not found" });
      }
      if (String(existing.venueUserId) !== getAuthUserId(req)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const request = await gigRequestServices.declineGigRequest(req.params.id);
      res.status(200).json({ data: request });
    } catch (err) {
      res.status(400).json({ error: "Failed to decline gig request" });
    }
  }),
);

app.delete(
  "/gig-requests/:id",
  requireAuth(async (req, res) => {
    try {
      const request = await gigRequestServices.cancelGigRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Gig request not found" });
      }
      if (
        String(request.bandUserId) !== getAuthUserId(req) &&
        String(request.venueUserId) !== getAuthUserId(req)
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.status(200).json({ data: request });
    } catch (err) {
      res.status(400).json({ error: "Failed to cancel gig request" });
    }
  }),
);

app.get("/availability", async (req, res) => {
  try {
    const { ownerType, ownerId, start, end, status } = req.query;

    if (!ownerType || !ownerId) {
      return res.status(400).json({
        error: "ownerType and ownerId are required",
      });
    }

    const slots = await availabilityService.getSlots({
      ownerType,
      ownerId,
      start,
      end,
      status,
    });

    res.status(200).json({ data: slots });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

app.post("/availability", async (req, res) => {
  try {
    const { ownerType, ownerId, start, end, status, notes } = req.body;

    if (!ownerType || !ownerId || !start || !end) {
      return res.status(400).json({
        error: "ownerType, ownerId, start, and end are required",
      });
    }

    const slot = await availabilityService.createAvailability({
      ownerType,
      ownerId,
      start,
      end,
      status,
      notes,
    });

    res.status(201).json({ data: slot });
  } catch (err) {
    res.status(400).json({
      error: err.message || "Failed to create availability",
    });
  }
});

app.delete("/availability/:id", async (req, res) => {
  try {
    const deleted = await availabilityService.deleteAvailability(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Availability slot not found" });
    }

    res.status(200).json({ data: deleted });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete availability" });
  }
});

app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Image must be 5MB or smaller" });
    }
    return res.status(400).json({ error: "Upload failed" });
  }
  if (err && err.message === "Only image uploads are allowed") {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

app.get("/", (req, res) => {
  res.send("Giggly API is running !!");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
