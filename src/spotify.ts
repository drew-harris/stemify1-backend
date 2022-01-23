import fetch from "node-fetch";
import * as Mongo from "mongodb";
import { getDB } from "./db";

let _token = null;

export async function getToken(): Promise<string> {
  if (_token) {
    return _token;
  }
  const db = await getDB();
  const result = await db.collection("spotify").findOne({});
  console.log(result.token);
  _token = result.token;
  return _token;
}

export async function newToken(): Promise<string> {
  if (_token) {
    return _token;
  }
  try {
    console.log("Getting new token...");
    const result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + process.env.SPOTIFY_BASE64,
      },
      body: "grant_type=client_credentials",
    });
    if (!result.ok) {
      throw new Error(result.statusText);
    }
    const data: any = await result.json();
    const db = await getDB();
    db.collection("spotify").updateOne(
      {},
      { $set: { token: data.access_token } }
    );

    _token = data.access_token;
    return data.access_token;
  } catch (error) {
    console.log(error);
  }
}
