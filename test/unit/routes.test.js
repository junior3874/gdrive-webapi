import { describe, test, expect, jest } from "@jest/globals";
import Routes from "../../src/routes.js";

describe("#Routes switch test", () => {
  const defaultParams = {
    request: {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      method: "",
      body: {},
    },
    response: {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn(),
    },
    values: () => Object.values(defaultParams),
  };

  describe("#setSocketInstance", () => {
    test("setSocket should store in instance", () => {
      const routes = new Routes();
      const ioObject = {
        to: (id) => ioObject,
        emit: (event, message) => {},
      };

      routes.setSocketInstance(ioObject);

      expect(routes.io).toStrictEqual(ioObject);
    });
  });

  describe("#handler", () => {
    //mocking request and response from server

    test("given an inexisting route it should choose defaul route", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };

      params.request.method = "inexistent";
      routes.handler(...params.values());

      expect(params.response.end).toHaveBeenCalledWith("Hello world");
    });

    test("it should set any request with CORS enabled", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };

      routes.handler(...params.values());

      expect(params.response.setHeader).toHaveBeenCalledWith(
        "Acess-Control-Allow-Origin",
        "*"
      );
    });

    test("given method OPTIONS it should choose options route", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };
      params.request.method = "OPTIONS";
      routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(204);
    });

    test("given method POST it should choose post route", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };
      params.request.method = "POST";

      jest.spyOn(routes, routes.post.name).mockResolvedValue();

      await routes.handler(...params.values());
      expect(routes.post).toHaveBeenCalled();
    });

    test("given method GET it should choose get route", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };
      params.request.method = "GET";

      jest.spyOn(routes, routes.get.name).mockResolvedValue();

      await routes.handler(...params.values());
      expect(routes.get).toHaveBeenCalled();
    });
  });

  describe("#get", () => {
    test("given methods GET with should list all files downloaded", async () => {
      const routes = new Routes();

      const params = {
        ...defaultParams,
      };

      params.request.method = "GET";

      const filesStatusesMock = [
        {
          size: "0 B",
          lastModified: "2021-09-06T22:09:02.787Z",
          owner: "memoria",
          file: "mockingFile.txt",
        },
      ];

      jest
        .spyOn(routes.fileHelper, routes.fileHelper.getFilesStatus.name)
        .mockResolvedValue(filesStatusesMock);

      await routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(200);
      expect(params.response.end).toHaveBeenCalledWith(
        JSON.stringify(filesStatusesMock)
      );
    });
  });
});
