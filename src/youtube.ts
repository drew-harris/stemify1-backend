import * as ytdl from "ytdl-core";
import * as spotify from "./spotify";

export async function getInfo(url: string) {
  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid URL");
  }

  const info = await (await ytdl.getInfo(url)).videoDetails;
  let songData = null;
  if (info?.media?.song) {
    const queryTitle = info.media.song;
    const queryArtist = info.media.artist || "";
    songData = await spotify.getSongData(queryTitle + " " + queryArtist, false);
  } else {
    songData = await spotify.getSongData(info.title, false);
  }
  return songData;
}
