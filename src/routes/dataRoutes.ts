import { Router } from "express";

import { getSongData } from "../spotify";
import * as yt from "../youtube";
let router = Router();

router.get("/:name", async (req, res) => {
  const name = req.params.name;
  try {
    const data = await getSongData(name, true);
    res.json(data);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/", async (req, res) => {
  try {
    const url = req.body.url;
    const info = await yt.getInfo(url);
    res.json(info);
  } catch (error) {
    console.log(error);
    res.status(404).send(error.message);
  }
});

export { router };
