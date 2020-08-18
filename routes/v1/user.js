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
  prepauthToken(
    useUser,
    {
      params: {
        id: { type: "id" },
      },
    },
    async function ({ params: { id } }, me) {
      if (id !== me.content.id) {
        return new HttpError(401);
      }
      return me.getPublic();
    }
  );

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
  prepauthPW(
    useUser,
    {
      params: {
        id: { type: "id" },
      },
    },
    async function ({ params: { id } }, me) {
      if (id !== me.content.id) {
        return new HttpError(401);
      }

      try {
        await me.delete();
      } catch (e) {
        return exceptionTo(NotFound, e, HttpError.notFound("user"));
      }
      return "ok";
    }
  );

const updateUser = (useUser) =>
  prepauthToken(
    useUser,
    {
      params: {
        id: { type: "id" },
      },
      body: {
        name: { type: "string", optional: true },
        email: { type: "email", optional: true },
        newpassword: { type: "password", optional: true },
        password: { type: "password", optional: true },
      },
    },
    async function ({ dbs, body: { name, email, newpassword, password } }, me) {
      const [, , NoUser] = useUser(dbs);

      if (!me.resetTokenUsed) {
        await me.checkAuthPw(password);
      } else {
        me.content.tokenForReset = null;
        await me.genToken();
      }

      if (!name && !email && !newpassword) {
        return new HttpError(400, "nothing to update");
      }
      if (name) {
        me.content.name = name;
      }
      if (newpassword) {
        await me.setPw(newpassword);
        await me.genToken();
      }
      if (email) {
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
      }
      await me.update();
      return "ok";
    },
    { strap: true }
  );

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
        await me.load({ email: email.toLowerCase() });
      } catch (e) {
        catchException(NotFound, e);
        return "ok";
      }
      await me.genResetToken();
      await mail.sendMail(
        email,
        AUTH_CONFIG.resetPWMail.body
          .replace(/##NAME##/g, me.content.name)
          .replace(
            /##URL##/g,
            AUTH_CONFIG.resetUrl +
              `?token=${encodeURIComponent(me.content.tokenForReset)}`
          ),
        AUTH_CONFIG.resetPWMail.title.replace(/##NAME##/g, me.content.name)
      );
      await me.update();

      return "ok";
    },
    { strap: true }
  );

module.exports = {
  addUser,
  getUser,
  getToken,
  getAPIToken,
  deleteUser,
  updateUser,
  resetPassword,
};
