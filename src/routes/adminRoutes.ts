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
        approved: false,
      })
      .limit(100)
      .toArray();
    res.json(songs);
  } catch (error) {
    res.status(500).send("There was an error getting unapproved songs");
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

export { router };