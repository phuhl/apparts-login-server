const setupDB = require("./setupDB.js");
const config = require('apparts-config').get("db-config");
const dbinit = require('apparts-db');


let run = (test) => (err, dbs) => {
  if(err){
    console.error('DB Error: ' + err);
    return;
  }

  setupDB.setupCollections(dbs, '')
    .then(() => {
      console.log('OK');
      process.exit();
    })
    .catch(e => console.error(e));
};

dbinit(config.deploy, run(false));
