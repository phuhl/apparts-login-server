"use strict";

const { HttpError } = require('apparts-error');
const Model = require('apparts-model');
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const UserSettings = require('apparts-config').get('login');


module.exports = (dbs) => class User extends Model(dbs) {
  constructor(contents){
    super({
      _id: { type: "id", public: true, mapped: "id", key: true },
      name: { type: "string", public: true },
      email: { type: "email", unique: true },
      token: { type: "base64" },
      hash: { type: "/" },
      createdOn: { type: "time", default: () => new Date.getTime() },
      credits: { type: "float", default: 0 }
    }, "user", contents);
  }

  _checkToken(token){
    return (token && token === this.contents[0].token) ? Promise.resolve(this)
      : Promise.reject(new HttpError(401));
  }

  checkAuth(token, email){
    return this._checkToken(token);
  }

  _checkPw(password){
    return new Promise((res, rej) => {
      bcrypt.compare(
        password, this.contents[0].hash,
        (err, authenticated) => {
          if(err){
            throw "[Model] could not compare password, E36: "+ err;
          } else if(authenticated){
            res(this);
          } else {
            rej(new HttpError(401));
          }
        });
    });
  }

  checkAuthPw(password, email){
    return this._checkPw(password);
  }

  setPw(password){
    return new Promise((res, rej) => {
      bcrypt.genSalt(UserSettings.pwHashRounds, (err, salt) => {
        if(err){
          throw "[User] Could not generate salt, E34: " + err;
        } else {
          res(salt);
        }
      });
    }).then(salt => {
      return new Promise((res, rej) => {
        bcrypt.hash(password, salt, null, (err, hash) => {
          if(err){
            throw "[User] could not generate hash, E35" + err;
          }
          res(hash);
        });
      });
    }).then(hash => {
      this.contents[0].hash = hash;
      return Promise.resolve(this);
    });
  }

  genToken(){
    return new Promise((res, rej) => {
      crypto.randomBytes(
        UserSettings.tokenLength,
        (err, token) => {
          if(err){
            throw "[User] Could not generate Token, E33" + err;
          } else {
            this.contents[0].token = token.toString('base64');
            res(this);
          }
        });
    });
  }

  addCredits(c){
    this.contents[0].credits += c;
    return this;
  }
};
