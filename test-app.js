const logger = require("@apparts/logger");
logger.deploy();
logger.l.remove(logger.l.transports.file);

const applyMiddleware = require("./middleware");
const addRoutes = require("./routes");
const express = require("express");

const useUser = require("./model/user");

module.exports = (DB_CONFIG) => {
  const app = express();
  app.use((req, res, next) => {
    req.headers = {
      ...req.headers,
      "x-apigateway-event": encodeURIComponent(
        JSON.stringify({
          path: "/foo/bar",
          queryStringParameters: {
            foo: "💩",
          },
        })
      ),
      "x-apigateway-context": encodeURIComponent(
        JSON.stringify({ foo: "bar" })
      ),
    };

    next();
  });

  applyMiddleware(app, DB_CONFIG, true);
  addRoutes(app, useUser, (...ps) => {
    console.log("mail", ...ps);
  });
  return app;
};

module.exports.shutdown = () => {
  return applyMiddleware.shutdown();
};
