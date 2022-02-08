import { Router } from "express";
import { getDB } from "../db";
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

export { router };
