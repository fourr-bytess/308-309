import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bandServices from './band-services.js';
import venueServices from './venue-services.js';
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import musicianServices from './musician-services.js';
import reviewServices from './review-services.js';
import gigServices from "./gig-services.js";
import authServices from "./auth-services.js";
import { VALID_ROLES } from "./user.js";
import notificationServices from "./notification-services.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(express.json());
app.use(cors());

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
  const normalized = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function extractBearerToken(req) {
  const header = req.get ? req.get("authorization") : req.headers?.authorization;
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
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
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


mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giggly")
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

app.post("/auth/register", async (req, res) => {
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

    return res.status(201).json({
      data: {
        id: created._id,
        email: created.email,
        display_name: created.display_name,
        role: created.role,
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

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await authServices.authenticateUser({ email, password });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = authServices.createAccessToken(user);
    return res.status(200).json({
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
        },
      },
    });
  } catch (_err) {
    return res.status(500).json({ error: "Failed to login" });
  }
});

app.get("/auth/verify", requireAuth(async (req, res) => {
  return res.status(200).json({ data: { valid: true, user: req.auth } });
}));

app.get('/bands', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const minPrice = req.query.min_price !== undefined ? Number(req.query.min_price) : undefined;
    const maxPrice = req.query.max_price !== undefined ? Number(req.query.max_price) : undefined;
    const price_range =
      Number.isFinite(minPrice) && Number.isFinite(maxPrice) ? [minPrice, maxPrice] : undefined;

    const filters = {
      name: req.query.name,
      members: req.query.members?.split(','),
      genres: req.query.genres?.split(','),
      locations: req.query.locations?.split(','),
      price_range,
    };

    const total = await bandServices.getBandsCount(filters);
    const cappedLimit = Math.min(limit, 50);
    const { bands } = await bandServices.getBandsPaginated(cappedLimit, offset, filters);
    res.status(200).json({ data: bands, meta : { limit: cappedLimit, offset, total } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bands' });
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



app.post('/bands', requireAuth(async (req, res) => {
  try {
    const created = await bandServices.addBand(req.body);
    res.status(201).json({ data: created });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create band' });
  }
}));

app.delete("/bands/:id", requireAuth(async (req,res) => {
    try{
        const deleted = await bandServices.findBandByIdAndDelete(req.params.id);
        if (!deleted){
            return res.status(404).json({error: "Band not found"});
        }
        res.status(200).json({data: deleted});
    }catch(err){
        return res.status(404).json({error: "Invalid ID"});
    }
}));

app.post("/bands/:id/profile-picture", imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    const imageUrl = makeUploadedImageUrl(req, "bands", req.file.filename);
    const updatedBand = await bandServices.updateBandProfilePicture(req.params.id, imageUrl);
    if (!updatedBand) {
      return res.status(404).json({ error: "Band not found" });
    }
    res.status(200).json({ data: updatedBand });
  } catch (err) {
    res.status(400).json({ error: "Failed to upload band profile picture" });
  }
});

app.post("/bands/:id/gallery", imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    const imageUrl = makeUploadedImageUrl(req, "band-gallery", req.file.filename);
    const updatedBand = await bandServices.addBandGalleryImage(req.params.id, imageUrl);
    if (!updatedBand) {
      return res.status(404).json({ error: "Band not found" });
    }
    res.status(200).json({ data: updatedBand });
  } catch (err) {
    res.status(400).json({ error: "Failed to upload band gallery image" });
  }
});

app.delete("/bands/:id/gallery", requireAuth(async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }
    const updatedBand = await bandServices.removeBandGalleryImage(req.params.id, imageUrl);
    if (!updatedBand) {
      return res.status(404).json({ error: "Band not found" });
    }
    res.status(200).json({ data: updatedBand });
  } catch (err) {
    res.status(400).json({ error: "Failed to remove band gallery image" });
  }
}));

app.post("/bands/:id", requireAuth(async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const videoId = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n]+)/)?.[1];
    if (!videoId) return res.status(400).json({ error: "Invalid URL"});
    const updatedBand = await bandServices.addBandVideo(req.params.id, videoId);
    res.status(200).json({ data: updatedBand });
  } catch (err) {
    res.status(400).json({ error: "Failed to upload video"});
  }
}));

app.delete("/bands/:id/videos/:videoId", requireAuth(async (req, res) => {
  try {
    // 2. Now both id and videoId are available in req.params
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
}));

//GET /venues
app.get("/venues", async (req, res) => {
  try {
    const { name, city, state, zip } = req.query;

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
      capacity_range
    );

    res.json({ data: venues });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

// POST /venues
app.post("/venues", requireAuth(async (req, res) => {
  try {
    const created = await venueServices.addVenue(req.body);
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(400).json({ error: "Failed to create venue" });
  }
}));

// GET /venues/:id
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
app.delete("/venues/:id", requireAuth(async (req, res) => {
  try {
    const deleted = await venueServices.findVenueByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Venue not found" });
    }
    res.json({ data: deleted });
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID" });
  }
}));

// GET /gigs
app.get("/gigs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const cappedLimit = Math.min(limit, 50);

    const minPrice = req.query.min_price !== undefined ? Number(req.query.min_price) : undefined;
    const maxPrice = req.query.max_price !== undefined ? Number(req.query.max_price) : undefined;
    const price_range =
      Number.isFinite(minPrice) && Number.isFinite(maxPrice) ? [minPrice, maxPrice] : undefined;

    const filters = {
      name: req.query.name,
      description: req.query.description,
      genres: req.query.genres?.split(","),
      location: req.query.location,
      price_range,
      host: req.query.host,
      booked: req.query.booked === "true" ? true : req.query.booked === "false" ? false : undefined,
    };

    const total = await gigServices.getGigsCount(filters);
    const { gigs } = await gigServices.getGigsPaginated(cappedLimit, offset, filters);
    res.status(200).json({ data: gigs, meta: { limit: cappedLimit, offset, total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gigs" });
  }
});

// GET /gigs/:id
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
app.post("/gigs", requireAuth(async (req, res) => {
  try {
    const created = await gigServices.addGig(req.body);
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(400).json({ error: "Failed to create gig" });
  }
}));

// DELETE /gigs/:id
app.delete("/gigs/:id", requireAuth(async (req, res) => {
  try {
    const deleted = await gigServices.findGigByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Gig not found" });
    }
    res.status(200).json({ data: deleted });
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID" });
  }
}));

// GET /musicians
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
      filters
    );

    res.status(200).json({ data: musicians, meta: { limit: cappedLimit, offset, total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch musicians" });
  }
});

// GET /musicians/:id
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

// POST /musicians
app.post("/musicians", requireAuth(async (req, res) => {
  try {
    const created = await musicianServices.addMusician(req.body);
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(400).json({ error: "Failed to create musician" });
  }
}));

// DELETE /musicians/:id
app.delete("/musicians/:id", requireAuth(async (req, res) => {
  try {
    const deleted = await musicianServices.findMusicianByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Musician not found" });
    }
    res.status(200).json({ data: deleted });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
}));

app.post("/musicians/:id/profile-picture", imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    const imageUrl = makeUploadedImageUrl(req, "musicians", req.file.filename);
    const updatedMusician = await musicianServices.updateMusicianProfilePicture(req.params.id, imageUrl);
    if (!updatedMusician) {
      return res.status(404).json({ error: "Musician not found" });
    }
    res.status(200).json({ data: updatedMusician });
  } catch (err) {
    res.status(400).json({ error: "Failed to upload musician profile picture" });
  }
});

app.post("/musicians/:id/videos", requireAuth(async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const videoId = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n]+)/)?.[1];
    if (!videoId) return res.status(400).json({ error: "Invalid URL"});
    const updatedMusician = await musicianServices.addMusicianVideo(req.params.id, videoId);
    res.status(200).json({ data: updatedMusician });
  } catch (err) {
    res.status(400).json({ error: "Failed to upload video"});
  }
}));

app.delete("/musicians/:id/videos/:videoId", requireAuth(async (req, res) => {
  try {
    const updated = await musicianServices.removeMusicianVideo(id, videoId);
    res.status(200).json({ data: updated });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete video"});
  }
}));

// GET /musicians/:id/reviews
app.get("/musicians/:id/reviews", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const cappedLimit = Math.min(limit, 50);

    const filters = { reviewee: req.params.id, revieweeType: 'Musician' };
    const total = await reviewServices.getReviewsCount(filters);
    const { reviews } = await reviewServices.getReviewsPaginated(cappedLimit, offset, filters);

    res.status(200).json({ data: reviews, meta: { limit: cappedLimit, offset, total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// GET /reviews
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
    const { reviews } = await reviewServices.getReviewsPaginated(cappedLimit, offset, filters);
    res.status(200).json({ data: reviews, meta: { limit: cappedLimit, offset, total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST /reviews
app.post("/reviews", requireAuth(async (req, res) => {
  try {
    const { reviewer, reviewee, revieweeType, rating, header, body } = req.body;
    if (reviewer == null || reviewee == null || revieweeType == null || rating == null) {
      return res.status(400).json({ error: "reviewer, reviewee, revieweeType, and rating are required" });
    }

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      return res.status(400).json({ error: "rating must be a number between 0 and 5" });
    }

    const validTypes = ['Band', 'Venue', 'Musician'];
    if (!validTypes.includes(revieweeType)) {
      return res.status(400).json({ error: "revieweeType must be Band, Venue, or Musician" });
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
}));

app.get("/notifications", async (req, res) => {
  try {
    const notifications = await notificationServices.getNotificationsByUser(
      req.query.userId,
    );
    res.status(200).json({ data: notifications });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/notifications/unread-count", async (req, res) => {
  try {
    const unreadCount = await notificationServices.getUnreadCount(
      req.query.userId,
    );
    res.status(200).json({ data: { unreadCount } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/notifications", async (req, res) => {
  try {
    const created = await notificationServices.createNotification(req.body);
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/notifications/:id/read", async (req, res) => {
  try {
    const updated = await notificationServices.markNotificationAsRead(
      req.params.id,
    );
    res.status(200).json({ data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/notifications/read-all", async (req, res) => {
  try {
    const result = await notificationServices.markAllNotificationsAsRead(
      req.body.userId,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/notifications/:id", async (req, res) => {
  try {
    const deleted = await notificationServices.deleteNotification(
      req.params.id,
    );
    res.status(200).json({ data: deleted });
  } catch (err) {
    res.status(400).json({ error: err.message });
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


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));