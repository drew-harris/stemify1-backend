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

    app.get("/trackmigration", async (_, res) => {
      try {
        const db = await getDB();
        await db
          .collection("songs")
          .updateMany({}, { $set: { approved: true } });
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
