
"use strict";



const router = require('express').Router();
const { preparator, prepauth } = require('apparts-types');
const UserSettings = require('apparts-config').get('login');
const { HttpError, exceptionTo, catchException } = require('apparts-error');
const { NotUnique, NotFound, DoesExist } = require('apparts-model');
const { HttpUserNotFound, HttpUserExists } = require('../util/errors');

module.exports = (dbs, mailhandler) => {

  let User = require('../model/user.js')(dbs);

  router.post('/', preparator(
    {
      body: {
        name: {type: 'string'},
        email: {type: 'email'},
        password: {type: 'password'}
      }
    },
    async function({ body : { name, email, password }}){
      if(name.length < UserSettings.nameLengthMin ){
        return new HttpError(400, "name to short");
      }
      if(name.length < UserSettings.nameLengthMin ){
        return new HttpError(400, "pw to short");
      }

      const me = new User({ name, email: email.toLowerCase(),
                          createdOn: new Date().getTime()});
      await me.setPw(password);
      await me.genToken();
      try {
        await me.storeUnique();
      } catch(e){
        return exceptionTo(DoesExist, e, new HttpUserExists());
      }
      await mailhandler.sendMailToAddresses("welcome", email);
      return { id: me.contents[0]._id,
               token: me.contents[0].token};
    }));

  router.get('/:id', prepauth(
    dbs, {
      params: {
        id: { type: 'id' }
      }
    },
    async function({ params : { id }}, me){
      if(id !== me.contents[0]._id){
        return new HttpError(401);
      }

      try {
        const u = await new User().loadById(id);
        return u.getPublic(true);
      } catch(e) {
        return exceptionTo(NotFound, e, new HttpUserNotFound());
      }
    }));

  router.get('/:id/token', prepauth(
    dbs, { }, async function(req, me){
      return { id: me.contents[0]._id,
               token: me.contents[0].token};
    }, null, true));

  router.delete('/:id', prepauth(
    dbs, {
      params: {
        id: { type: 'id' }
      }
    },
    async function({ params: { id }}, me){
      if(id !== me.contents[0]._id){
        return new HttpError(401);
      }

      try {
        await me.delete();
      } catch(e) {
        return exceptionTo(NotFound, e, new HttpUserNotFound());
      }
      return "ok";
    }, null, true));

  router.put('/:id', prepauth(
    dbs, {
      params: {
        id: { type: 'id'}
      },
      body: {
        name: {type: 'string', optional: true},
        email: {type: 'email', optional: true},
        newpassword: {type: 'password', optional: true}
      }
    },
    async function({ params: { id }, body}, me){
      if(Object.keys(body).length === 0){
        return new HttpError(400, "nothing to update");
      }
      if(id !== me.contents[0]._id){
        return new HttpError(401);
      }
      if(body.name){
        me.contents[0].name = body.name;
      }
      if(body.newpassword) {
        await me.setPw(body.newpassword);
      }
      if(body.email){
        try {
          await new User().loadNone({ email : body.email.toLowerCase() });
          me.contents[0].email = body.email.toLowerCase();
        } catch (e) {
          return exceptionTo(DoesExist, e,
                             new HttpError(400, "Email exists already"));
        }
      }
      await me.update();
      return "ok";
    }, {strap : true}, true));

  return router;
};
