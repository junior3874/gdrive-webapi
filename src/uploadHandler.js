import Busboy from "busboy";
import { pipeline } from "stream/promises";
import fs from "fs";
import { logger } from "./logger.js";
export default class UploadHandler {
  constructor({ io, socketId, downloadsFolder, messageTimeDelay = 200 }) {
    this.io = io;
    this.socketId = socketId;
    this.downloadsFolder = downloadsFolder;
    this.ON_UPLOAD_EVENT = "file-upload";
    this.messageTimeDelay = messageTimeDelay;
  }

  canExecute(lastExecution) {
    return Date.now() - lastExecution >= this.messageTimeDelay;
  }
  handleFileBytes(fileName) {
    this.lastMessageSent = Date.now();

    async function* handleData(source) {
      let processAlready = 0;
      for await (const chunk of source) {
        yield chunk;
        processAlready += chunk.length;

        if (!this.canExecute(this.lastMessageSent)) {
          continue;
        }

        this.lastMessageSent = Date.now();
        this.io
          .to(this.socketId)
          .emit(this.ON_UPLOAD_EVENT, { processAlready, fileName });
        logger.info(
          `File ${fileName} got ${processAlready} bytes to ${this.socketId}`
        );
      }
    }

    return handleData.bind(this);
  }

  async onFile(fieldName, file, fileName) {
    const saveTo = `${this.downloadsFolder}/${fileName}`;

    await pipeline(
      // take one readable stream
      file,
      // filter, converter and transform data!
      this.handleFileBytes.apply(this, [fileName]),
      // process exist, one writable streeam
      fs.createWriteStream(saveTo)
    );

    logger.info(`File [${fileName}] finished`);
  }

  registerEvents(headers, onFinish) {
    const busboy = new Busboy({ headers });
    busboy.on("file", this.onFile.bind(this));
    busboy.on("finish", onFinish);

    return busboy;
  }
}
