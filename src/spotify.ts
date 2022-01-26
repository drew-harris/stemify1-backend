import fetch from "node-fetch";
import * as Mongo from "mongodb";
import { getDB } from "./db";

let _token = null;

class StatusError extends Error {
  status: number | undefined;
}

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

export async function getSongData(filename) {
  let token = await getToken();
  console.log(token);
  const paramsObj = {
    q: getSongName(filename),
    type: "track",
    limit: "1",
    market: "US",
  };
  console.log(paramsObj);
  let data;
  try {
    const result = await fetch(
      "https://api.spotify.com/v1/search?" + new URLSearchParams(paramsObj),
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );
    if (!(await result).ok) {
      console.log(result);
      let err = new StatusError(result.statusText);
      err.status = result.status;
      throw err;
    }
    data = await result.json();
  } catch (err) {
    if (err.status == 401) {
      console.log("Token expired, getting new token...");
      token = await newToken();
      console.log("Got new token: " + token);
      const result = await fetch(
        "https://api.spotify.com/v1/search?" + new URLSearchParams(paramsObj),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );
      if (!(await result).ok) {
        console.log(result);
        throw new Error("Unable to get song data");
      }
      data = await result.json();
    }
  }
  if (data.tracks.items.length == 0) {
    throw new Error("Unable to get song data");
  }
  const trackData = data.tracks.items[0];

  const betterOutput = {
    title: trackData.name,
    metadata: {
      albumId: trackData.album.id,
      spotifyId: trackData.id,
      albumTitle: trackData.album.name,
      albumArt: trackData.album.images[0].url,
      artist: trackData.artists[0].name,
      artistId: trackData.artists[0].id,
      previewUrl: trackData.preview_url,
    },
    bpm: null,
  };

  betterOutput.bpm = await getBpm(betterOutput.metadata.spotifyId);
  console.log(data.tracks.items[0]);
  return betterOutput;
}

async function getBpm(spotifyId: string) {
  const token = await getToken();
  const result = await fetch(
    `https://api.spotify.com/v1/audio-features/${spotifyId}`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    }
  );
  if (!(await result).ok) {
    console.log(result);
    throw new Error("Unable to get BPM");
  }
  const data = await result.json();
  return data.tempo;
}

function getSongName(filename) {
  let termArray = filename
    .toLowerCase()
    .replace(/[^a-z]/g, " ")
    .replace(/\s\s+/g, " ")
    .split(" ");

  let bannedWords = ["mp", "drums", "vocals", "other", "remix", "bass"];

  let songName = "";
  loop1: for (let i = 0; i < termArray.length; i++) {
    const word = termArray[i];
    if (word.length == 0) {
      continue;
    }

    for (let j = 0; j < bannedWords.length; j++) {
      if (word.includes(bannedWords[j])) {
        continue loop1;
      }
    }

    songName += word + " ";
  }
  console.log(songName);
  return songName;
}
