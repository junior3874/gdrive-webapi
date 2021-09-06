import { describe, test, expect, jest } from "@jest/globals";

import fs from "fs";
import FileHelper from "../../src/fileHelper.js";

describe("#File helper", () => {
  describe("#getFileStatus", () => {
    test("it should return files statuses in correct format", async () => {
      const statMock = {
        dev: 2053,
        mode: 33204,
        nlink: 1,
        uid: 1000,
        gid: 1000,
        rdev: 0,
        blksize: 4096,
        ino: 19406114,
        size: 0,
        blocks: 0,
        atimeMs: 1630966151924.956,
        mtimeMs: 1630966151875,
        ctimeMs: 1630966151872.9214,
        birthtimeMs: 1630966142786.7332,
        atime: "2021-09-06T22:09:11.925Z",
        mtime: "2021-09-06T22:09:11.875Z",
        ctime: "2021-09-06T22:09:11.873Z",
        birthtime: "2021-09-06T22:09:02.787Z",
      };
      const mockUser = "well";
      process.env.USER = mockUser;
      const mockFileName = "file.txt";
      jest
        .spyOn(fs.promises, fs.promises.readdir.name)
        .mockResolvedValue([mockFileName]);

      jest
        .spyOn(fs.promises, fs.promises.stat.name)
        .mockResolvedValue(statMock);

      const result = await FileHelper.getFilesStatus("/tmp");
      const expectedResult = [
        {
          size: "0 B",
          lastModified: statMock.birthtime,
          owner: mockUser,
          file: mockFileName,
        },
      ];
      expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${mockFileName}`);
      expect(result).toMatchObject(expectedResult);
    });
  });
});
