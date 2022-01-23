import * as CloudStorage from "@google-cloud/storage";
const storage = new CloudStorage.Storage();
import slugify from "slugify";

const songBucket = storage.bucket("stemshare-songs");

export async function uploadFile(
  file: Express.Multer.File,
  folderName: string
): Promise<any> {
  const promise = new Promise((resolve, reject) => {
    const blob = songBucket.file(`${folderName}/${slugify(file.originalname)}`);
    const blobStream = blob.createWriteStream();
    blobStream.on("error", (err) => {
      throw err;
    });

    blobStream.on("finish", () => {
      // The public URL can be used to directly access the file via HTTP.
      const publicUrl = `https://storage.googleapis.com/${songBucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
  return promise;
}
