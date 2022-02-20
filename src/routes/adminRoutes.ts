import { Router } from "express";
import { getDB } from "../db";
import * as Mongo from "mongodb";
const router = Router();

router.delete("/wipequeue", async (req, res) => {
  try {
    const db = await getDB();
    await db.collection("songs").deleteMany({ complete: false });
    await db.collection("tickets").deleteMany({ complete: false });
    res.send("Queue wiped");
  } catch (error) {
    res.status(500).send("There was an error wiping the queue");
  }
});

router.get("/approve", async (req, res) => {
  try {
    const db = await getDB();
    const songs = await db
      .collection("songs")
      .find({
        complete: true,
        adminHidden: false,
        approved: false,
      })
      .limit(100)
      .toArray();
    res.json(songs);
  } catch (error) {
    res.status(500).send("There was an error getting unapproved songs");
  }
});

router.post("/albumart/:id", async (req, res) => {
  try {
    if (!req.body.albumArt) {
      res.status(400).send("No album art provided");
    }
    const db = await getDB();
    const songId = new Mongo.ObjectId(req.params.id);
    await db
      .collection("songs")
      .updateOne(
        { _id: songId },
        { $set: { "metadata.albumArt": req.body.albumArt } }
      );
    res.send("Album art updated");
  } catch (error) {
    res.status(500).send("Error updating album art");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const song = await db
      .collection("songs")
      .findOne({ _id: new Mongo.ObjectId(req.params.id) });
    const ticketId = song.ticketId;
    await db
      .collection("songs")
      .deleteOne({ _id: new Mongo.ObjectId(req.params.id) });

    await db
      .collection("tickets")
      .deleteOne({ _id: new Mongo.ObjectId(ticketId) });
    res.send("Song deleted");
  } catch (error) {
    res.status(500).send("There was an error deleting the song");
  }
});

router.post("/approve/all", async (req, res) => {
  try {
    const db = await getDB();
    await db
      .collection("songs")
      .updateMany({ approved: false }, { $set: { approved: true } });
    res.send("Songs approved");
  } catch (error) {
    console.log(error);
    res.status(500).send("There was an error approving all songs");
  }
});

router.post("/approve/:id", async (req, res) => {
  try {
    const id: string = req.params.id;
    const db = await getDB();
    console.log(id);
    await db
      .collection("songs")
      .updateOne({ _id: new Mongo.ObjectId(id) }, { $set: { approved: true } });
    res.send("Song approved");
  } catch (error) {
    console.log(error);
    res.status(500).send("There was an error approving the song");
  }
});

router.post("/hide/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id: string = req.params.id;
    console.log(id);
    db.collection("songs").updateOne(
      { _id: new Mongo.ObjectId(id) },
      { $set: { adminHidden: true } }
    );
    res.send("Song hidden");
  } catch (error) {
    res.status(500).send("There was an error hiding the song");
  }
});

router.get("/queue", async (req, res) => {
  try {
    const db = await getDB();
    const songsInQueue = await db
      .collection("songs")
      .find({ complete: false, adminHidden: false, approved: false })
      .toArray();

    res.json(songsInQueue);
  } catch (error) {
    res.status(500).send("There was an error getting the queue");
  }
});

export { router };
