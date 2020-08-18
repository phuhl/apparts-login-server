"use strict";

const { preparator, prepauthPW, prepauthToken } = require("@apparts/types");
const { HttpError, exceptionTo, catchException } = require("@apparts/error");
const { NotUnique, NotFound, DoesExist } = require("@apparts/model");
const UserSettings = require("@apparts/config").get("login-config");

const addUser = (useUser, mail) =>
  preparator(
    {
      body: {
        email: { type: "email" },
        ...UserSettings.extraTypes,
      },
    },
    async ({ dbs, body: { email, ...extra } }, req) => {
      const [, User] = useUser(dbs);
      const me = new User({
        email: email.toLowerCase(),
      });
      await me.setExtra(extra);
      await me.genResetToken();
      try {
        await me.store();
      } catch (e) {
        return exceptionTo(DoesExist, e, new HttpError(413, "User exists"));
      }
      const { title, body } = me.getWelcomeMail();
      await mail.sendMail(email, body, title);
      return "ok";
    }
  );
addUser.returns = [
  { status: 200, value: "ok" },
  { status: 413, error: "User exists" },
];

const getUser = (useUser) =>
  prepauthToken(useUser, {}, async function (_, me) {
    return me.getPublic();
  });
getUser.returns = [
  { status: 200, type: "object", values: "/" },
  ...prepauthPW.returns,
];

const getToken = (useUser) =>
  prepauthPW(useUser, {}, async function (req, me) {
    const apiToken = await me.getAPIToken();
    return {
      id: me.content.id,
      loginToken: me.content.token,
      apiToken,
    };
  });
getToken.returns = [
  {
    status: 200,
    type: "object",
    values: {
      id: { type: "id" },
      loginToken: { type: "base64" },
      apiToken: { type: "string" },
    },
  },
  ...prepauthPW.returns,
];

const getAPIToken = (useUser) =>
  prepauthToken(useUser, {}, async function (req, me) {
    const apiToken = await me.getAPIToken();
    return apiToken;
  });
getAPIToken.returns = [
  {
    status: 200,
    type: "string",
  },
  ...prepauthToken.returns,
];

const deleteUser = (useUser) =>
  prepauthPW(useUser, {}, async function (_, me) {
    await me.deleteMe();
    return "ok";
  });
deleteUser.returns = [{ status: 200, value: "ok" }, ...prepauthPW.returns];

const updateUser = (useUser) =>
  prepauthToken(
    useUser,
    {
      body: {
        password: { type: "password", optional: true },
      },
    },
    async function ({ dbs, body: { password } }, me) {
      const [, , NoUser] = useUser(dbs);

      if (me.resetTokenUsed) {
        if (!password) {
          return new HttpError(400, "Password required");
        }
        me.content.tokenforreset = null;
      }

      if (!password) {
        return new HttpError(400, "Nothing to update");
      }

      /* istanbul ignore else */
      if (password) {
        await me.setPw(password);
        await me.genToken();
      }
      /* if (email) {
        try {
          await new NoUser().loadNone({ email: email.toLowerCase() });
          me.content.email = email.toLowerCase();
        } catch (e) {
          return exceptionTo(
            DoesExist,
            e,
            new HttpError(400, "Email exists already")
          );
        }
      }*/
      await me.update();
      const apiToken = await me.getAPIToken();
      return {
        id: me.content.id,
        loginToken: me.content.token,
        apiToken,
      };
    }
  );
updateUser.returns = [
  { status: 400, error: "Nothing to update" },
  { status: 400, error: "Password required" },
  {
    status: 200,
    type: "object",
    values: {
      id: { type: "id" },
      loginToken: { type: "base64" },
      apiToken: { type: "string" },
    },
  },
  ...prepauthPW.returns,
];

const resetPassword = (useUser, mail) =>
  preparator(
    {
      params: {
        email: { type: "email" },
      },
    },
    async function ({ dbs, params: { email } }) {
      const [, User] = useUser(dbs);

      const me = new User();
      try {
        await me.load({ email: email.toLowerCase(), deleted: false });
      } catch (e) {
        return exceptionTo(NotFound, e, HttpError.notFound("User"));
      }
      await me.genResetToken();

      await me.update();

      const { title, body } = me.getResetPWMail();
      await mail.sendMail(email, body, title);

      return "ok";
    }
  );
resetPassword.returns = [
  { status: 404, error: "User not found" },
  { status: 200, value: "ok" },
];

module.exports = {
  addUser,
  getUser,
  getToken,
  getAPIToken,
  deleteUser,
  updateUser,
  resetPassword,
};
