import {
  describe,
  jest,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterAll,
} from "@jest/globals";
import fs from "fs";

import Routes from "../../src/routes.js";
import FormData from "form-data";
import TestUtil from "../_util/testUtil.js";
import { logger } from "../../src/logger.js";
import { tmpdir } from "os";
import { join } from "path";

describe("#Routes integration tests", () => {
  let defaultDownloadsFolder;
  beforeAll(async () => {
    defaultDownloadsFolder = await fs.promises.mkdtemp(
      join(tmpdir(), "downloads-")
    );
  });
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  afterAll(async () => {
    await fs.promises.rm(defaultDownloadsFolder, { recursive: true });
  });

  describe("#post", () => {
    const ioObj = {
      to: (id) => ioObj,
      emit: (event, message) => {},
    };

    test("should upload file to the folder", async () => {
      const fileName = "testing.txt";

      const fileStream = fs.createReadStream(
        `./test/integration/mocks/${fileName}`
      );
      const response = TestUtil.generateReadableStream(() => {});

      const form = new FormData();
      form.append("photo", fileStream);

      const defaultParams = {
        request: Object.assign(form, {
          headers: form.getHeaders(),
          method: "POST",
          url: "?socketId=10",
        }),
        response: Object.assign(response, {
          setHeader: jest.fn(),
          writeHead: jest.fn(),
          end: jest.fn(),
        }),
        values: () => Object.values(defaultParams),
      };

      const routes = new Routes(defaultDownloadsFolder);
      routes.setSocketInstance(ioObj);
      const dirBeforeRUn = await fs.promises.readdir(defaultDownloadsFolder);
      expect(dirBeforeRUn).toEqual([]);
      await routes.handler(...defaultParams.values());
      const dirAfterRun = await fs.promises.readdir(defaultDownloadsFolder);
      expect(dirAfterRun).toEqual([fileName]);

      expect(defaultParams.response.writeHead).toHaveBeenCalledWith(200);
      const stringyResponseData = JSON.stringify({
        result: "Files uploaded with sucess!",
      });
      expect(defaultParams.response.end).toHaveBeenCalledWith(
        stringyResponseData
      );
    });
  });
});
