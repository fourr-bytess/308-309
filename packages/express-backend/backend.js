import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bandServices from './band-services.js';
import venueServices from './venue-services.js';
import dotenv from "dotenv";
import musicianServices from './musician-services.js';
dotenv.config({ path: new URL("./.env", import.meta.url).pathname });

const app = express();
app.use(express.json());
app.use(cors());


mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

app.get('/bands', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const total = await bandServices.getBandsCount({
      name: req.query.name,
      member_names: req.query.member_names?.split(','),
      genres: req.query.genres?.split(','),
      locations: req.query.locations?.split(','),
      price_range: [req.query.min_price, req.query.max_price]
    });
    const cappedLimit = Math.min(limit, 50);
    const { bands } = await bandServices.getBandsPaginated(cappedLimit, offset, {
      name: req.query.name,
      member_names: req.query.member_names?.split(','),
      genres: req.query.genres?.split(','),
      locations: req.query.locations?.split(','),
      price_range: [req.query.min_price, req.query.max_price]
      
    });
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



app.post('/bands', async (req, res) => {
  try {
    const created = await bandServices.addBand(req.body);
    res.status(201).json({ data: created });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create band' });
  }
});

app.delete("/bands/:id", async (req,res) => {
    try{
        const deleted = await bandServices.findBandByIdAndDelete(req.params.id);
        if (!deleted){
            return res.status(404).json({error: "Band not found"});
        }
        res.status(200).json({data: deleted});
    }catch(err){
        return res.status(404).json({error: "Invalid ID"});
    }
});

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
app.post("/venues", async (req, res) => {
  try {
    const created = await venueServices.addVenue(req.body);
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(400).json({ error: "Failed to create venue" });
  }
});

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
app.delete("/venues/:id", async (req, res) => {
  try {
    const deleted = await venueServices.findVenueByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Venue not found" });
    }
    res.json({ data: deleted });
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID" });
  }
});

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
app.post("/musicians", async (req, res) => {
  try {
    const created = await musicianServices.addMusician(req.body);
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(400).json({ error: "Failed to create musician" });
  }
});

// DELETE /musicians/:id
app.delete("/musicians/:id", async (req, res) => {
  try {
    const deleted = await musicianServices.findMusicianByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Musician not found" });
    }
    res.status(200).json({ data: deleted });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));