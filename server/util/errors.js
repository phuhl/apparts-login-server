const { HttpError } = require('apparts-error');

class HttpUserNotFound extends HttpError {
  constructor(params){
    super({...params, code: 404, message: "User not found"});
  }
};

class HttpUserExists extends HttpError {
  constructor(params){
    super({...params, code: 400, message: "Username taken"});
  }
};


module.exports = { HttpUserNotFound, HttpUserExists };
