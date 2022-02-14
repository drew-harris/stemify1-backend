import { Router } from "express";
import { setupMongo, getDB } from "../db";
import * as mongo from "mongodb";
import { rmSync } from "fs";
const router = Router();

router.get("/:id", async (req, res) => {
  const songId = req.params.id;
  try {
    const db = await getDB();
    // Check if there is id in database
    const doc = await db
      .collection("onetimekeys")
      .findOne({ songId: req.params.id });
    if (!doc) {
      db.collection("onetimekeys").insertOne({
        songId: req.params.id,
        key: req.query.key,
      });
    } else if (doc.key != req.query.key) {
      res.status(400).send("Invalid key");
      return;
    }

    const song = await db
      .collection("songs")
      .findOne({ _id: new mongo.ObjectId(songId) });

    if (!song) {
      res.status(404).send("Song not found");
      return;
    } else {
      res.json(song);
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("There was an error getting the song");
  }
});

export { router };
