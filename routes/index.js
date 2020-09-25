const {
  addUser,
  getUser,
  getToken,
  getAPIToken,
  deleteUser,
  updateUser,
  resetPassword,
} = require("./v1/user");

const addRoutesForUpgrade = (app, f, apiVersion = 1) => {
  app.post("/v/" + apiVersion + "/user", f);
  app.get("/v/" + apiVersion + "/user/login", f);
  app.get("/v/" + apiVersion + "/user/apiToken", f);
  app.get("/v/" + apiVersion + "/user", f);
  app.delete("/v/" + apiVersion + "/user", f);
  app.put("/v/" + apiVersion + "/user", f);
  app.post("/v/" + apiVersion + "/user/:email/reset", f);
};

const addRoutes = (app, useUser, mail, apiVersion = 1) => {
  app.post("/v/" + apiVersion + "/user", addUser(useUser, mail));
  app.get("/v/" + apiVersion + "/user/login", getToken(useUser, mail));
  app.get("/v/" + apiVersion + "/user/apiToken", getAPIToken(useUser, mail));
  app.get("/v/" + apiVersion + "/user", getUser(useUser, mail));
  app.delete("/v/" + apiVersion + "/user", deleteUser(useUser, mail));
  app.put("/v/" + apiVersion + "/user", updateUser(useUser, mail));
  app.post(
    "/v/" + apiVersion + "/user/:email/reset",
    resetPassword(useUser, mail)
  );
};

module.exports = addRoutes;
module.exports.upgrade = addRoutesForUpgrade;
