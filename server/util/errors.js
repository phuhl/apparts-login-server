const { HttpError } = require('apparts-error');

class HttpUserNotFound extends HttpError {
  constructor(params){
    super(404, "User not found");
  }
};

class HttpUserExists extends HttpError {
  constructor(params){
    super(400, "Username taken");
  }
};


module.exports = { HttpUserNotFound, HttpUserExists };
