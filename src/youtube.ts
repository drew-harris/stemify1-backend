import * as ytdl from "ytdl-core";
import * as spotify from "./spotify";

export async function getInfo(url: string) {
  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid URL");
  }

  const info = await (await ytdl.getInfo(url)).videoDetails;
  let songData = null;
  console.log(info);
  if (info?.media?.song) {
    const queryTitle = info.media.song;
    const queryArtist = info.media.artist || "";
    songData = await spotify.getSongData(queryTitle + " " + queryArtist, false);
  } else {
    const channelName = info.author.name.substring(
      0,
      info.author.name.indexOf(" - ")
    );
    console.log(channelName);
    songData = await spotify.getSongData(
      info.title + " " + channelName || "",
      false
    );
  }
  return songData;
}
