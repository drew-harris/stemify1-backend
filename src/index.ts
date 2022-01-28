require("dotenv").config();
const express = require("express");
const Multer = require("multer");
var cors = require("cors");
import slugify from "slugify";
import { uploadFile } from "./storage";
import { setupMongo, getDB } from "./db";
import { getSongData } from "./spotify";
import * as Mongo from "mongodb";
import { time } from "console";

async function main() {
  try {
    await setupMongo();
    const app = express();

    app.use(cors());
    const PORT = process.env.PORT || 3000;

    app.use(express.json());

    const multer = Multer({
      storage: Multer.memoryStorage(),
      limits: {
        fileSize: 32 * 1024 * 1024, // no larger than 32mb, you can change as needed.
      },
    });

    app.get("/", (_, res) => {
      res.send("Hello World!");
    });

    app.get("/data/:name", async (req, res) => {
      const name = req.params.name;
      try {
        const data = await getSongData(name);
        res.json(data);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.get("/songs", async (req, res) => {
      const db = await getDB();
      db.collection("songs")
        .find({
          complete: true,
        })
        .sort({
          timeSubmitted: -1,
        })
        .toArray((err, docs) => {
          if (err) {
            res.status(500).send(err);
          } else {
            res.json(docs);
          }
        });
    });

    app.get("/queue", async (req, res) => {
      try {
        const db = await getDB();
        const songs = await db
          .collection("songs")
          .find({
            complete: false,
          })
          .toArray();

        res.json(songs);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.post("/ticket/file", multer.single("file"), async (req, res) => {
      console.log(req.body);
      const data = JSON.parse(req.body.data);

      const songId = new Mongo.ObjectId();
      const ticketId = new Mongo.ObjectId();
      const extension = req.file.originalname.split(".").pop();
      const slug =
        slugify(data.title, { lower: true }) +
        "-" +
        songId.toString().substring(18, 25);
      //TODO: validate data

      if (!data.title) {
        res.status(400).send("Missing title");
      }

      const song = {
        _id: songId,
        timeSubmitted: Date.now(),
        songSlug: slug,
        title: data.title,
        colors: data.colors || ["#FF0000", "#0000FF"],
        metadata: {
          trackId: data.metadata.trackId || null,
          albumId: data.metadata.albumId || null,
          albumTitle: data.metadata.albumTitle || null,
          albumArt: data.metadata.albumArt || null,
          albumName: data.metadata.albumName || null,
          artist: data.metadata.artist || null,
          artistId: data.metadata.artistId || null,
          previewUrl: data.metadata.previewUrl || null,
        },
        bpm: data.bpm || 120,

        vocals: `https://storage.googleapis.com/stem-share-demucs-output/${slug}/vocals.${extension}`,
        bass: `https://storage.googleapis.com/stem-share-demucs-output/${slug}/bass.${extension}`,
        drums: `https://storage.googleapis.com/stem-share-demucs-output/${slug}/drums.${extension}`,
        other: `https://storage.googleapis.com/stem-share-demucs-output/${slug}/other.${extension}`,

        extension: extension,
        complete: false,
        ticketId: ticketId,
      };

      const ticket = {
        _id: ticketId,
        timeSubmitted: Date.now(),
        slug: slug,
        extension: song.extension,
        created: Date.now(),
        complete: false,
      };

      try {
        const db = await getDB();
        //TODO Promise all or something
        await db.collection("songs").insertOne(song);
        await db.collection("tickets").insertOne(ticket);
        req.file.name = "input" + song.extension;
        await uploadFile(req.file, slug, song.extension);
      } catch (error) {
        res.status(500).json({
          error: error.message,
          message: "Unable to submit ticket",
        });
      }
      console.log(song);

      res.json({
        ticketId: ticketId,
      });
    });

    app.get("/demucs/ticket", async (req, res) => {
      try {
        const db = await getDB();
        const result = await db
          .collection("tickets")
          .find({
            complete: false,
          })
          .sort({ timeSubmitted: 1 })
          .limit(1)
          .toArray();
        if (result.length === 0) {
          res.status(404).send("No tickets found");
        } else {
          res.json(result[0]);
        }
      } catch (error) {
        res.status(500).json({
          error: error.message,
          message: "Unable to get ticket",
        });
      }
    });

    app.post("/demucs/ticket/complete/:id", async (req, res) => {
      const db = await getDB();
      await db.collection("tickets").findOneAndUpdate(
        {
          _id: new Mongo.ObjectId(req.params.id),
        },
        {
          $set: {
            complete: true,
          },
        }
      );

      await db.collection("songs").findOneAndUpdate(
        {
          ticketId: new Mongo.ObjectId(req.params.id),
        },
        {
          $set: {
            complete: true,
          },
        }
      );

      res.json({
        message: "Ticket marked as complete",
      });
    });

    app.get("/ticket/:id", async (req, res) => {
      const db = await getDB();
      const result = await db.collection("tickets").findOne({
        _id: new Mongo.ObjectId(req.params.id),
      });

      res.json({
        ticket: result,
      });
    });

    // DECPRECATED
    app.post("/upload", multer.any(), async (req, res) => {
      try {
        let id = new Mongo.ObjectId();
        const data = JSON.parse(req.body.data);
        let files = req.files.sort((a, b) => {
          return a.fieldname.localeCompare(b.fieldname);
        });
        const folderName =
          slugify(data.name, { lower: true }) +
          "-" +
          id.toString().substring(18, 25);

        const song = {
          _id: id,
          name: data.name,
          spotifyId: data.spotifyId,
          spotifyAlbumId: data.spotifyAlbumId,
          artist: data.artist,
          album: data.album,
          previewUrl: data.previewUrl,
          albumArt: data.albumArt,
          trackNumber: data.trackNumber,
          bpm: data.bpm,
        };

        const db = await getDB();

        await db.collection("songs").insertOne(song);

        res.json(song);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
}

main();
