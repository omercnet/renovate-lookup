const bodyParser = require("body-parser");
const defaults = require("renovate/dist/config/defaults");
const lookup = require("renovate/dist/workers/repository/process/lookup");
const cors = require('cors')

const app = require("express")();
app.use(bodyParser.json());
app.use(cors())

app.set("port", process.env.PORT || 8081);

app.post("/api", async (req, res) => {
  try {
    const config = defaults.getConfig();
    for (const key in req.body) {
      config[key] = req.body[key];
    }
    res.send(await lookup.lookupUpdates(config));
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


module.exports = app