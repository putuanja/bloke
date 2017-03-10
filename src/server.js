import _              from 'lodash';
import ip             from 'ip';
import localWebServer from 'local-web-server';
import * as VARS      from './variables';

export function server (options, callback) {
  if (2 > arguments.length) {
    return server({}, options);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  options = _.defaultsDeep(options, {
    gzip    : true,
    port    : 8080,
    host    : '0.0.0.0',
    root    : VARS.DISTRICT_PATH,
    verbose : false,
  });

  let serv = localWebServer({
    compress   : options.gzip,
    verbose    : process.env.SILENT ? false : options.verbose,
    static     : {
      root: options.root,
    },
    serveIndex : {
      path: options.root,
    },
  });

  serv.listen(options.port, options.host, function (error) {
    if (error) {
      callback(error);
      return;
    }

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
