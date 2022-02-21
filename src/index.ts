require("dotenv").config();
const express = require("express");
var cors = require("cors");
import { setupMongo, getDB } from "./db";

// Routes
import { router as dataRouter } from "./routes/dataRoutes";
import { router as songRouter } from "./routes/songRoutes";
import { router as demucsRouter } from "./routes/demucsRoutes";
import { router as ticketRouter } from "./routes/ticketRoutes";
import { router as adminRouter } from "./routes/adminRoutes";
import { router as oneTimeRouter } from "./routes/oneTimeRoutes";

async function main() {
  try {
    await setupMongo();
    const app = express();

    app.use(cors());
    const PORT = process.env.PORT || 3000;

    app.use(express.json());

    app.use("/data", dataRouter);
    app.use("/songs", songRouter);
    app.use("/demucs", demucsRouter);
    app.use("/ticket", ticketRouter);
    app.use("/admin", adminRouter);
    app.use("/onetime", oneTimeRouter);

    app.get("/", (_, res) => {
      res.send("Hello World!");
    });

    app.post("/artist", async (req, res) => {
      try {
        let filter;
        if (req.body.id) {
          filter = {
            "metadata.artistId": req.body.id || "zzzzz",
            complete: true,
            approved: true,
          };
        } else {
          filter = {
            "metadata.artist": req.body.name,
            complete: true,
            approved: true,
          };
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
          filter = {
            "metadata.albumId": req.body.id || "zzzzz",
            approved: true,
            complete: true,
          };
        } else {
          filter = {
            "metadata.albumTitle": req.body.name,
            approved: true,
            complete: true,
          };
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

    const transformUrl = (url) => {
      return url.replace(
        "https://storage.stemify.io/",
        "https://storage.stemify.io/"
      );
    };

    app.get("/trackmigration", async (_, res) => {
      try {
        const db = await getDB();
        const cursor = await db.collection("songs").find({});
        while (await cursor.hasNext()) {
          const song = await cursor.next();

          song.vocals = transformUrl(song.vocals);
          song.drums = transformUrl(song.drums);
          song.bass = transformUrl(song.bass);
          song.other = transformUrl(song.other);
          db.collection("songs").replaceOne({ _id: song._id }, song, {
            upsert: true,
          });
        }
        res.send("Done");
      } catch (error) {
        console.log(error);
        res.json({ message: "ERROR" });
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
