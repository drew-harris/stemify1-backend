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

  try {
    const db = await getDB();
    // Find songs with same album name uploaded in the last 20 minutes
    const songs = await db
      .collection("songs")
      .find({
        "metadata.albumTitle": data.metadata.albumTitle,
        complete: false,
      })
      .toArray();
    if (songs.length > 0) {
      res.status(418).send("Beach House Method");
      return;
    }
  } catch (error) {
    res.status(500).send("Could not check for duplicate songs");
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
    // If no result found
    if (!result) {
      res.status(404).send("Song not found");
      return;
    }

    if (result.complete) {
      res.json({ song: result });
    } else if (result?.timeSubmitted) {
      const cursor = await db.collection("tickets").find({
        complete: false,
        timeSubmitted: { $lt: result.timeSubmitted },
      });
      console.log(await cursor.count());

      // Find started less than 20 minutes ago
      const latest = await db
        .collection("tickets")
        .find({
          started: { $gt: new Date(new Date().getTime() - 5 * 60 * 1000) },
        })
        .limit(1)
        .toArray();
      console.log(latest);
      let active = latest.length > 0 ? true : false;

      res.json({
        song: result || null,
        lineLength: await cursor.count(),
        demucsRunning: active,
      });
    } else {
      res.json({
        song: result || null,
        lineLength: 0,
      });
    }
  } catch (error) {
    res.status(500).send("Unable to get ticket");
  }
});

router.post("/file", multer.single("file"), async (req, res) => {
  const data = JSON.parse(req.body.data);
  console.log(data);
  try {
    const db = await getDB();
    // Find songs with same album name uploaded in the last 20 minutes
    const songs = await db
      .collection("songs")
      .find({
        "metadata.albumTitle": data.metadata.albumTitle,
        complete: false,
        // timeSubmitted: { $gt: new Date(Date.now() - 20 * 60 * 1000) },
      })
      .toArray();
    if (songs.length > 0) {
      res.status(418).send("Beach House Method");
      return;
    }
  } catch (error) {
    res.status(500).send("Could not check for duplicate songs");
  }

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
