import { Router } from "express";
import { setupMongo, getDB } from "../db";
import * as Mongo from "mongodb";

const router = Router();

router.get("/ticket", async (_, res) => {
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

router.post("/ticket/complete/:id", async (req, res) => {
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

export { router };
