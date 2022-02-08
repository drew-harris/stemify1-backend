import { Router } from "express";
import { setupMongo, getDB } from "../db";
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

export { router };
