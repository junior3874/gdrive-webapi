import fs from "fs";
import prettyBytes from "pretty-bytes";

export default class FileHelper {
  static async getFilesStatus(downloadsFolder) {
    const currentFiles = await fs.promises.readdir(downloadsFolder);

    const statuses = await Promise.all(
      currentFiles.map((file) => fs.promises.stat(`${downloadsFolder}/${file}`))
    );

    const filesStatuses = statuses.map(({ birthtime, size }, fileIndex) => ({
      lastModified: birthtime,
      size: prettyBytes(size),
      file: currentFiles[fileIndex],
      owner: process.env.USER,
    }));

    return filesStatuses;
  }
}
