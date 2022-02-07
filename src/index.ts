require("dotenv").config();
const express = require("express");
const Multer = require("multer");
var cors = require("cors");
import slugify from "slugify";
import { uploadFile, getBucket } from "./storage";
import { setupMongo, getDB } from "./db";
import { getSongData } from "./spotify";
import * as Mongo from "mongodb";
import * as yt from "./youtube";
import * as ytdl from "ytdl-core";
import * as songs from "./songs";

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
        fileSize: 39 * 1024 * 1024, // no larger than 32mb, you can change as needed.
      },
    });

    app.get("/", (_, res) => {
      res.send("Hello World!");
    });

    app.get("/data/:name", async (req, res) => {
      const name = req.params.name;
      try {
        const data = await getSongData(name, true);
        res.json(data);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.post("/data", async (req, res) => {
      try {
        const url = req.body.url;
        const info = await yt.getInfo(url);
        res.json(info);
      } catch (error) {
        console.log(error);
        res.status(404).send(error.message);
      }
    });

    app.get("/songs", async (_, res) => {
      const db = await getDB();
      db.collection("songs")
        .find({
          complete: true,
        })
        .sort({
          timeSubmitted: -1,
        })
        // TODO: Change this back
        .limit(350)
        .toArray((err, docs) => {
          if (err) {
            res.status(500).send(err);
          } else {
            res.json(docs);
          }
        });
    });

    app.get("/songs/p/:page", async (req, res) => {
      const page = req.params.page;
      const db = await getDB();
      db.collection("songs")
        .find({
          complete: true,
        })
        .sort({
          timeSubmitted: -1,
        })
        // TODO: Change this back
        .limit(100)
        .skip(100 * page)
        .toArray((err, docs) => {
          if (err) {
            res.status(500).send(err);
          } else {
            res.json(docs);
          }
        });
    });

    app.post("/artist", async (req, res) => {
      try {
        let filter;
        if (req.body.id) {
          filter = { "metadata.artistId": req.body.id || "zzzzz" };
        } else {
          filter = { "metadata.artist": req.body.name };
        }
        const db = await getDB();
        const discog = await db
          .collection("songs")
          .find(filter)
          .sort({
            "metadata.albumArt": 1,
            "metadata.trackNum": 1,
          })
          .toArray();
        res.json(discog);
      } catch (error) {
        res.status(500).send("There was an error getting the album");
      }
    });

    app.post("/album", async (req, res) => {
      try {
        let filter;
        if (req.body.id) {
          filter = { "metadata.albumId": req.body.id || "zzzzz" };
        } else {
          filter = { "metadata.albumTitle": req.body.name };
        }
        const db = await getDB();
        const album = await db
          .collection("songs")
          .find(filter)
          .sort({
            "metadata.trackNum": 1,
          })
          .toArray();
        res.json(album);
      } catch (error) {
        res.status(500).send("There was an error getting the album");
      }
    });

    app.post("/songs/search", async (req, res) => {
      const query = req.body.query;
      if (!query) {
        res.status(400).send("No query");
      }
      try {
        console.log(query);
        const db = await getDB();
        const results = await db
          .collection("songs")
          .aggregate([
            { $match: { $text: { $search: query } } },
            { $sort: { score: { $meta: "textScore" } } },
          ])
          .toArray();
        res.json(results);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.get("/queue", async (_, res) => {
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

    app.post("/ticket/youtube", multer.none(), async (req, res) => {
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

      // Set song in database
      let song;
      try {
        song = await songs.makeSong(data, "mp3");
      } catch (error) {
        res.status(500).send(error.message);
      }

      console.log("Uploading song...");
      try {
        let blob = await getBucket().file(`${song.songSlug}/input.mp3`);
        const blobStream = blob.createWriteStream();

        await ytdl
          .default(req.body.url, { filter: "audioonly" })
          .pipe(blobStream);

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

    app.post("/ticket/file", multer.single("file"), async (req, res) => {
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
        //TODO Promise all or something
        req.file.name = "input." + extension;
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

    app.get("/demucs/ticket", async (_, res) => {
      try {
        const db = await getDB();
        // Find pending ticket started more than an hour ago
        const firstTry = await db.collection("tickets").findOne({
          complete: false,
          started: {
            // More than ten minutes ago
            $lt: new Date(Date.now() - 600000),
          },
          pending: true,
        });

        if (firstTry) {
          res.json(firstTry);
          return;
        }

        const ticket = await db.collection("tickets").findOneAndUpdate(
          {
            complete: false,
            pending: false,
            // oldest first
          },
          {
            $set: {
              pending: true,
              started: new Date(),
            },
          },
          {
            sort: {
              timeSubmitted: 1,
            },
          }
        );

        if (!ticket) {
          res.status(404).send("No tickets found");
          return;
        } else {
          res.json(ticket.value);
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
            pending: false,
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
      } catch (error) {}
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
}

main();
