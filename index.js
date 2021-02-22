const addRoutes = require("./routes");
const routes = require("./routes/v1/user");
const createUseUser = require("./model/user");

module.exports = { addRoutes, routes, createUseUser };
