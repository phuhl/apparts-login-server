const addRoutes = require("./routes");
const routes = require("./routes/v1/user");
const useUser = require("./model/user");

module.exports = { addRoutes, routes, useUser };
