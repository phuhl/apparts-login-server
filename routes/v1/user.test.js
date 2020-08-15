const request = require("supertest");
const {
  checkType,
  allChecked,
  app,
  url,
  error,
  getPool,
} = require("../../tests")(
  require("./user"),
  require("./tests/config.js"),
  [],
  "user"
);

const useUser = require("../../model/user.js");

const {
  apiToken: { webtokenkey, expireTime },
} = require("@apparts/config").get("login-config");
const JWT = require("jsonwebtoken");
const jwt = (email, id, extra = {}, action = "login") =>
  JWT.sign(
    {
      id,
      action,
      email,
      ...extra,
    },
    webtokenkey,
    { expiresIn: expireTime }
  );

let dateNowAll;
beforeEach(() => {
  dateNowAll = jest
    .spyOn(Date, "now")
    .mockImplementation(() => 1575158400000 + 1000 * 60 * 60 * 9.7);
});
afterEach(() => {
  dateNowAll.mockRestore();
});

describe("getToken", () => {
  test("User does not exist", async () => {
    const response = await request(app)
      .get(url("user/login"))
      .auth("doesnotexist@test.de", "a12345678");
    expect(response.body).toMatchObject(error("User not found"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Empty email address", async () => {
    const response = await request(app)
      .get(url("user/login"))
      .auth("", "a12345678");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Wrong password", async () => {
    const [, User] = useUser(getPool());

    await (
      await new User({ email: "tester@test.de" }).setPw("a12345678")
    ).store();

    const response = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "b12345678");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Empty password", async () => {
    const response = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Successfull login", async () => {
    const [, User] = useUser(getPool());
    const user = await new User().load({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "a12345678");
    expect(response.body).toMatchObject({
      id: user.content.id,
      loginToken: user.content.token,
      apiToken: jwt("tester@test.de", user.content.id),
    });
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "getToken")).toBeTruthy();
  });

  test("Extra infos in token", async () => {
    const [, User] = useUser(getPool());

    class User1 extends User {
      getExtraAPITokenContent() {
        return { tada: 4 };
      }
    }

    const user = await new User1().load({ email: "tester@test.de" });
    const token = await user.getAPIToken();
    expect(token).toBe(jwt("tester@test.de", user.content.id, { tada: 4 }));
  });
});

describe("getAPIToken", () => {
  test("User does not exist", async () => {
    const response = await request(app)
      .get(url("user/apiToken"))
      .auth("doesnotexist@test.de", "a12345678");
    expect(response.body).toMatchObject(error("User not found"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Empty email address", async () => {
    const response = await request(app)
      .get(url("user/apiToken"))
      .auth("", "a12345678");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Wrong token", async () => {
    const [, User] = useUser(getPool());
    const user = await new User().load({ email: "tester@test.de" });

    const response = await request(app)
      .get(url("user/apiToken"))
      .auth("tester@test.de", "aorsitenrstne");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Empty token", async () => {
    const response = await request(app)
      .get(url("user/apiToken"))
      .auth("tester@test.de", "");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Success", async () => {
    const [, User] = useUser(getPool());
    const user = await new User().load({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user/apiToken"))
      .auth("tester@test.de", user.content.token);
    expect(response.body).toBe(jwt("tester@test.de", user.content.id));
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
});

describe("All possible responses tested", () => {
  test("", () => {
    expect(allChecked("getToken")).toBeTruthy();
    expect(allChecked("getAPIToken")).toBeTruthy();
  });
});
