const addRoutes = require("./routes");
const express = require("express");
const {
  genApiDocs: { getApi, apiToHtml },
} = require("@apparts/types");

const app = express();
addRoutes(app);

const docs = apiToHtml(getApi(app));
console.log(docs);
