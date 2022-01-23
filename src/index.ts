require("dotenv").config();
const express = require("express");
const Multer = require("multer");
var cors = require("cors");
import slugify from "slugify";
import { uploadFile } from "./storage";
import fetch from "node-fetch";
import { setupMongo, getDB } from "./db";
import { getToken, getSongData } from "./spotify";
import * as Mongo from "mongodb";

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
        fileSize: 190 * 1024 * 1024, // no larger than 190mb, you can change as needed.
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

    app.post("/upload", multer.any(), async (req, res) => {
      try {
        let id = new Mongo.ObjectId();
        const data = JSON.parse(req.body.data);
        let files = req.files.sort((a, b) => {
          return a.fieldname.localeCompare(b.fieldname);
        });
        const folderName =
          slugify(data.title, { lower: true }) +
          "-" +
          id.toString().substring(18, 25);

        const bassPromise = uploadFile(files[0], folderName);
        const drumsPromise = uploadFile(files[1], folderName);
        const instrPromise = uploadFile(files[2], folderName);
        const vocalsPromise = uploadFile(files[3], folderName);

        const urls = await Promise.all([
          bassPromise,
          drumsPromise,
          instrPromise,
          vocalsPromise,
        ]);

        const song = {
          _id: id,
          name: data.name,
          spotifyId: data.spotifyId,
          spotifyAlbumId: data.spotifyAlbumId,
          artist: data.artist,
          album: data.album,
          previewUrl: data.previewUrl,
          albumArt: data.albumArt,
          bpm: data.bpm,
          bass: urls[0],
          drums: urls[1],
          instr: urls[2],
          vocals: urls[3],
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
