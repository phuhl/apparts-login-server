const {
  addUser,
  getUser,
  getToken,
  getAPIToken,
  deleteUser,
  updateUser,
  resetPassword,
} = require("./v1/user");

const addRoutes = (app, useUser, mail) => {
  app.post("/v/1/user/", addUser(useUser, mail));
  app.get("/v/1/user/login", getToken(useUser, mail));
  app.get("/v/1/user/apiToken", getAPIToken(useUser, mail));
  app.get("/v/1/user/:id", getUser(useUser, mail));
  app.delete("/v/1/user/:id", deleteUser(useUser, mail));
  app.put("/v/1/user/:id", updateUser(useUser, mail));
  app.post("/v/1/user/:email/reset", resetPassword(useUser, mail));
};

module.exports = addRoutes;
