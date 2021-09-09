import { describe, test, expect, jest, beforeEach } from "@jest/globals";

import fs from "fs";
import { pipeline } from "stream/promises";
import { resolve } from "path";
import UploadHandler from "../../src/uploadHandler.js";
import TestUtil from "../_util/testUtil.js";
import { logger } from "../../src/logger.js";

describe("#UploadHandler test suite", () => {
  const ioObj = {
    to: (id) => ioObj,
    emit: (event, message) => {},
  };

  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  describe("#registerEvents", () => {
    test("should call onFile and onFinish functions on Busboy instance", () => {
      const uploadHandler = new UploadHandler({ io: ioObj, socketId: "01" });

      jest.spyOn(uploadHandler, uploadHandler.onFile.name).mockResolvedValue();

      const headers = {
        "content-type": "multipart/form-data; boundary=",
      };

      const onFinish = jest.fn();
      const busboyInstance = uploadHandler.registerEvents(headers, onFinish);

      const fileStream = TestUtil.generateReadableStream([
        "chunck",
        "of",
        "data",
      ]);

      busboyInstance.emit("file", "fieldName", fileStream, "filename.txt");
      busboyInstance.listeners("finish")[0].call();

      expect(uploadHandler.onFile).toHaveBeenCalled();

      expect(onFinish).toHaveBeenCalled();
    });
  });
  describe("#onFile", () => {
    test("given a stream file it should save it on disk", async () => {
      const chuncks = ["hey", "dude"];

      const downloadsFolder = "/tmp";

      const handler = new UploadHandler({
        io: ioObj,
        socketId: "01",
        downloadsFolder,
      });

      const onData = jest.fn();

      jest
        .spyOn(fs, fs.createWriteStream.name)
        .mockImplementationOnce(() => TestUtil.generateWritableStream(onData));
      const onTransform = jest.fn();

      jest
        .spyOn(handler, handler.handleFileBytes.name)
        .mockImplementation(() =>
          TestUtil.generateTransformStream(onTransform)
        );

      const params = {
        fieldName: "video",
        file: TestUtil.generateReadableStream(chuncks),
        fileName: "mockfile.mov",
      };

      await handler.onFile(...Object.values(params));

      expect(onData.mock.calls.join()).toEqual(chuncks.join());
      expect(onTransform.mock.calls.join()).toEqual(chuncks.join());

      const expectedFilename = resolve(
        handler.downloadsFolder,
        params.fileName
      );

      expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFilename);
    });
  });
  describe("#handleFileBytes", () => {
    test("should call emit function and ti it is a readable stream", async () => {
      jest.spyOn(ioObj, ioObj.to.name);
      jest.spyOn(ioObj, ioObj.emit.name);

      const handler = new UploadHandler({
        io: ioObj,
        socketId: "01",
      });

      jest.spyOn(handler, handler.canExecute.name).mockReturnValueOnce(true);

      const messages = ["messages"];
      const source = TestUtil.generateReadableStream(messages);
      const onWriteFn = jest.fn();
      const target = TestUtil.generateWritableStream(onWriteFn);

      await pipeline(source, handler.handleFileBytes("filename.txt"), target);

      expect(ioObj.to).toHaveBeenCalledTimes(messages.length);
      expect(ioObj.emit).toHaveBeenCalledTimes(messages.length);

      //if handleFileBytes one transform stream, our pipeline
      // to go continues process, passing the data forward
      // and calling our function in target each in chunk

      expect(onWriteFn).toBeCalledTimes(messages.length);
      expect(onWriteFn.mock.calls.join()).toEqual(messages.join());
    });
    test("given message timerDelay as 2secs it should emit only two messages during 3 seconds periods", async () => {
      jest.spyOn(ioObj, ioObj.emit.name);

      const handler = new UploadHandler({
        io: ioObj,
        socketId: "01",
        messageTimeDelay: 2000,
      });

      const day = "2021-07-01 01:01";
      const onFirstLastMessageSent = TestUtil.getTimeFromDate(`${day}:00`);

      const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`);
      const onSecondUpdateLastMessageSent = onFirstCanExecute;
      const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`);
      const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:04`);

      TestUtil.mockDateNow([
        onFirstLastMessageSent,
        onFirstCanExecute,
        onSecondUpdateLastMessageSent,
        onSecondCanExecute,
        onThirdCanExecute,
      ]);

      const messages = ["hello", "hello", "world"];
      const expectedMessagesSent = 2;
      const fileName = "filename.avi";

      const source = TestUtil.generateReadableStream(messages);

      await pipeline(source, handler.handleFileBytes(fileName));

      expect(ioObj.emit).toHaveBeenCalledTimes(expectedMessagesSent);

      const [firstCallResult, secondCallResult] = ioObj.emit.mock.calls;
      expect(firstCallResult).toEqual([
        handler.ON_UPLOAD_EVENT,
        { processAlready: "hello".length, fileName },
      ]);
      expect(secondCallResult).toEqual([
        handler.ON_UPLOAD_EVENT,
        { processAlready: messages.join("").length, fileName },
      ]);
    });
  });

  describe("#canExecute", () => {
    test("should return true when time in later than specified delay", () => {
      const timerDelay = 1000;

      const uploadHandler = new UploadHandler({
        io: {},
        socketId: "",
        messageTimeDelay: timerDelay,
      });

      const tickNow = TestUtil.getTimeFromDate("2021-07-01 00:00:03");

      TestUtil.mockDateNow([tickNow]);
      const lastExecution = TestUtil.getTimeFromDate("2021-07-01 00:00:00");

      const result = uploadHandler.canExecute(lastExecution);

      expect(result).toBeTruthy();
    });
    test("should return true when time isnt later than specified delay", () => {
      const timerDelay = 3000;

      const uploadHandler = new UploadHandler({
        io: {},
        socketId: "",
        messageTimeDelay: timerDelay,
      });

      const now = TestUtil.getTimeFromDate("2021-07-01 00:00:02");

      TestUtil.mockDateNow([now]);

      const lastExecution = TestUtil.getTimeFromDate("2021-07-01 00:00:01");

      const result = uploadHandler.canExecute(lastExecution);

      expect(result).toBeFalsy();
    });
  });
});
