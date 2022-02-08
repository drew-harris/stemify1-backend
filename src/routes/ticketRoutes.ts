import { Router } from "express";
import * as Mongo from "mongodb";
import * as ytdl from "ytdl-core";
import * as songs from "../songs";
import { uploadFile, getBucket } from "../storage";
import { getDB } from "../db";
const Multer = require("multer");

const router = Router();

const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 39 * 1024 * 1024, // no larger than 32mb, you can change as needed.
  },
});

router.post("/youtube", multer.none(), async (req, res) => {
  let data;
  try {
    data = JSON.parse(req.body.data);
  } catch (error) {
    res.status(500).send("Could not get song data");
    return;
  }
  try {
    await songs.checkForSongs(data);
  } catch (error) {
    res.status(500).send(error.message);
    return;
  }

  if (!req.body.url) {
    throw new Error("No url provided");
  }

  // Set song in database
  let song;
  try {
    song = await songs.makeSong(data, "mp3", req.body.url);
  } catch (error) {
    res.status(500).send(error.message);
  }

  console.log("Uploading song...");
  try {
    let blob = await getBucket().file(`${song.songSlug}/input.mp3`);
    const blobStream = blob.createWriteStream();

    await ytdl.default(req.body.url, { filter: "audioonly" }).pipe(blobStream);

    blobStream.on("finish", async () => {
      console.log("DONE");
      res.json({
        ticketId: song.ticketId,
      });
    });

    blobStream.on("error", (err) => {
      console.log(err);
      res.status(500).send("There was an error uploading the song");
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("There was an error uploading the song");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.collection("songs").findOne({
      ticketId: new Mongo.ObjectId(req.params.id),
    });
    if (result.complete) {
      res.json({ song: null });
    } else {
      res.json({ song: result });
    }
  } catch (error) {
    res.status(500).send("Unable to get ticket");
  }
});

router.post("/file", multer.single("file"), async (req, res) => {
  const data = JSON.parse(req.body.data);

  try {
    await songs.checkForSongs(data);
  } catch (error) {
    res.status(500).send(error.message);
    return;
  }

  const extension = req.file.originalname.split(".").pop();

  const song = await songs.makeSong(data, extension);

  try {
    req.file.originalname = "input." + extension;
    await uploadFile(req.file, song.songSlug, song.extension);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Unable to submit ticket",
    });
  }
  console.log(song);

  res.json({
    ticketId: song.ticketId,
  });
});

export { router };
