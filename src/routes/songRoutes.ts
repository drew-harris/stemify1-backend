import { Router } from "express";
import { setupMongo, getDB } from "../db";
import * as mongo from "mongodb";
const router = Router();

router.get("/", async (_, res) => {
  const db = await getDB();
  db.collection("songs")
    .find({
      complete: true,
      approved: true,
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

router.get("/:id", async (req, res) => {
  const db = await getDB();
  db.collection("songs")
    .findOne({
      _id: new mongo.ObjectId(req.params.id),
    })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      res.status(404).send("Song not found");
    });
});

router.get("/status/howmany", async (_, res) => {
  try {
    const db = await getDB();
    let info = {
      total: 0,
      inQueue: 0,
      approved: 0,
      newToday: "WIP",
      totalDownloads: 0,
    };

    info.total = await db.collection("songs").countDocuments();
    info.inQueue = await db.collection("songs").countDocuments({
      complete: false,
    });
    info.approved = await db.collection("songs").countDocuments({
      approved: true,
    });
    res.json(info);
  } catch (error) {
    res.status(500).send("Could not get song count");
  }
});

router.get("/p/:page", async (req, res) => {
  const page = req.params.page;
  const db = await getDB();
  db.collection("songs")
    .find({
      complete: true,
      approved: true,
    })
    .sort({
      timeSubmitted: -1,
    })
    // TODO: Change this back
    .limit(100)
    .skip(100 * parseInt(page))
    .toArray((err, docs) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.json(docs);
      }
    });
});

router.post("/search", async (req, res) => {
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
        {
          $match: { $text: { $search: query }, approved: true, complete: true },
        },
        { $sort: { score: { $meta: "textScore" } } },
      ])
      .toArray();
    res.json(results);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/download/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).send("No id");
    }
    const db = await getDB();
    db.collection("songs").updateOne(
      {
        _id: new mongo.ObjectId(id),
      },
      {
        $set: {
          downloadCount: {
            $inc: 1,
          },
        },
      }
    );
    res.send("ok");
  } catch (error) {
    res.status(500).send("Could not mark as downloaded");
  }
});

export { router };
