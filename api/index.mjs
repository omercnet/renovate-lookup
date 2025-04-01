import "dotenv/config";
import bodyParser from "body-parser";
import * as defaultsParser from "renovate/dist/workers/global/config/parse/index.js";

import { lookupUpdates } from "renovate/dist/workers/repository/process/lookup/index.js";
import cors from "cors";
import express from "express";

import { mergeChildConfig } from "renovate/dist/config/utils.js";
import { PassThrough } from "stream";
import { initPlatform } from "renovate/dist/modules/platform/index.js";
import { logger } from "renovate/dist/logger/index.js";
import * as packageCache from "renovate/dist/util/cache/package/index.js";

import "dotenv/config";

const app = express();
app.use(bodyParser.json());
app.use(cors());

const logStream = new PassThrough();
const log = [];
logger.addStream({
  name: "dev",
  level: "info",
  stream: logStream,
});

logStream.on("data", (chunk) => {
  log.push(JSON.parse(chunk.toString()));
});

app.post("/api", async (req, res) => {
  try {
    let config = await defaultsParser.parseConfigs(process.env, []);
    config = mergeChildConfig(config, req.body);
    config = await initPlatform(config);
    await packageCache.init(config);

    res.send({
      res: await lookupUpdates(config),
      log,
    });
  } catch (err) {
    var errMessage = `${err}`;
    const statusCode = 500;
    console.log(`${statusCode} ${errMessage}`);
    res
      .status(statusCode)
      .json({
        error: {
          status: statusCode,
          message: errMessage,
        },
      })
      .end();
  }
});

export default app;
