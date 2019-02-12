const fs = require('fs');

let collections = [];


let createCollection = (dbs, model, prefix) => {
  let name = model._collection;
  let indexes = [];
  collections.push(name);
  // Unique
  Object.keys(model._types)
    .filter(key => model._types[key].unique)
    .forEach(key => { indexes.push({ name: key, unique: true }); });
  // Primary keys
  let keys = Object.keys(model._types)
        .filter(key => model._types[key].key)
        .reduce((a, b) => a.concat([b]), []);
  if(keys.length){
    indexes.push({ name: keys.join('_'), key: keys});
  }
  // Foreign keys
  indexes = indexes
    .concat(Object.keys(model._types)
            .filter(key => model._types[key].type === 'id' && key !== '_id')
            .map(key => ({ name: key,
                           foreign: {
                             table: prefix + key,
                             field: '_id'
                           }
                         })));
  // Fields
  let fields = Object.keys(model._types)
        .filter(k => model._types[k].persisted !== false)
        .map(
          k => ({ name: k,
                  type: dbs.convertType({...model._types[k], name: k}),
                  notNull: !model._types[k].optional
                }));
  return dbs.createCollection(name, indexes, fields, prefix);
};

/*let createCollection = (dbs, name, indexes) => {
  collections.push(name);
  return dbs.createCollection(name, indexes);
};*/


let setupCollections = (dbs, prefix) => {
  let dir = './server/model/';
  let models = fs.readdirSync(dir)
        .filter(f => !fs.statSync(dir + f).isDirectory())
        .filter(f => f.substr(-1) !== '~')
        .filter(f => f !== 'index.js' && f.substr(-8) !== '.test.js')
        .map(f => new (require('../.' + dir + f)(dbs))());


  let dependencies = models
        .map(model => Object.keys(model._types)
             .filter(
               key => model._types[key].type === 'id' && key !==
                 '_id')
             .map(key => prefix + key)
            );

  let done = [];
  let doIt = () => {
    let toDo = models
          .filter((model, i) => dependencies[i]
                  .reduce(
                    (a, b) => a && done.indexOf(b) !== -1, true))
          .filter(model => done.indexOf(model._collection) === -1);
    return Promise.all(
      toDo.map(model => createCollection(dbs, model, prefix)))
      .then(() => {
        done = models
          .filter((model, i) => dependencies[i]
                  .reduce((a, b) => a && done.indexOf(b) !== -1, true))
          .map(model => model._collection);
        if(done.length === models.length){
          return Promise.resolve();
        } else {
          return doIt();
        }
      })
      .catch(err => {
        console.log('ERROR in setupDB ', err);
        return Promise.reject(err);
      });
  };

  return doIt();
};

let removeCollections = dbs => {
  let cs = collections;
  collections = [];
  let doIt = () => {
    return dbs.collection(cs[cs.length - 1]).drop()
      .then(() => {
        cs = cs.slice(0, -1);
        if(cs.length > 0){
          return doIt();
        } else {
          return Promise.resolve();
        }
      });
  };
  return doIt();
};

let setupUsers = (dbs, test) => {
  return dbs.createUser({
    user: "testuser" + (test ? "_test" : ""),
    pwd: "123456",
    roles: [
      { role: "readWrite", db: "testuser" + (test ? "_test" : "")}
    ]
  });
};

module.exports = {setupCollections,
                  removeCollections,
                  createCollection,
                  setupUsers};
