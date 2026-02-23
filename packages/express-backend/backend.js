import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bandServices from './band-services.js';

const app = express();
app.use(express.json());
app.use(cors());

mongoose
  .connect('mongodb://localhost:27017/bands')
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

app.get('/bands', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const total = await bandServices.getBandsCount();
    const cappedLimit = Math.min(limit, 50);
    const { bands } = await bandServices.getBandsPaginated(cappedLimit, offset);
    res.status(200).json({ data: bands, meta : { limit: cappedLimit, offset, total } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bands' });
  }
});

app.get('/bands/:id', async (req, res) => {
  try {
    const band = await bandServices.findBandById(req.params.id);
    if (!band){
      return res.status(404).json({ error: 'Band not found' });
    }
    res.status(200).json({ data: band });
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch band' });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));