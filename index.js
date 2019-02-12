import Routes from './server/routes/user';
import Model from './server/model/user';
import { Errors } from './server/util/errors';



const exp = { Routes: { User: Routes }, Models: { User: Model }, Errors };

module.exports = exp;
