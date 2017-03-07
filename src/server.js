import _                from 'lodash';
import ip               from 'ip';
import { createServer } from 'http-server';
import * as VARS        from './variables';

export function server (options, callback) {
  if (2 > arguments.length) {
    return server({}, options);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  options = _.defaultsDeep(options, {
    port : 8080,
    host : '0.0.0.0',
    root : VARS.DISTRICT_PATH,
  });

  let serv = createServer(options);
  serv.listen(options.port, options.host, function (error) {
    if (error) {
      callback(error);
      return;
    }

    let closeHandle = serv.close.bind(serv);
    process.on('exit', closeHandle);
    process.on('SIGINT', closeHandle);

    callback(null, serv, [
      {
        name : 'Local',
        text : `http://127.0.0.1:${options.port}`,
      },
      {
        name : 'External',
        text : `http://${ip.address()}:${options.port}`,
      },
    ]);
  });
}
