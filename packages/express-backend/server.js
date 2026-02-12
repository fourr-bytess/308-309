import express from "express";
import mongoose from "mongoose";
import Band from "./band.js";

const app = express();
app.use(express.json());

//conect to mongo
mongoose
  .connect("mongodb://localhost:27017/bands")
  .then(() => console.log("Connected"))
  .catch((err) => console.error("Mongoose Error:", err));

app.get("/bands", async (req, res) => {
  try {
    const bands = await Band.find();
    res.json({ data: bands });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bands" });
  }
});
app.post("/bands", async (req, res) => {
  try {
    const created = await Band.create(req.body);
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(400).json({ error: "Failed to create" });
  }
});
app.get("/bands/:id", async (req, res) => {
  try {
    const band = await Band.findById(req.params.id);
    if (!band) {
      return res.status(404).json({ error: "Band not found" });
    }
    res.json({ data: band });
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID" });
  }
});

app.delete("/bands/:id", async (req,res) => {
    try{
        const deleted = await Band.findByIdAndDelete(req.params.id);
        if (!deleted){
            return res.status(404).json({error: "Band not found"});
        }
        res.json({data: deleted});
    }catch(err){
        return res.status(404).json({error: "Invalid ID"});
    }
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
