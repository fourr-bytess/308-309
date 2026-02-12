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
    res.json({data: bands});
  } catch(err){
    res.status(500).json({ error: "Failed to fetch bands" });
  }
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
