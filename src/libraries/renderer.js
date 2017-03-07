import _                from 'lodash';
import fs               from 'fs-extra';
import path             from 'path';
import async            from 'async';
// import { md5 }          from './utils';
import { includeTheme } from './converter';
import * as VARS        from '../variables';

export function render (pagedata, options, callback) {
  let theme          = includeTheme(options.theme);
  let { renderFile } = setupEngine(theme.config.engine);

  options = _.defaultsDeep(options, {
    src: VARS.ROOT_PATH,
  });

  let tasks = _.map(pagedata, function ({ data, template, output }) {
    return function (callback) {
      let html = renderFile(template, _.assign({}, data, options.metadata));

      fs.ensureDirSync(path.dirname(output));

      fs.writeFile(output, html, function (error) {
        if (error) {
          callback(error);
          return;
        }

        callback(null, {
          file   : output,
          assets : output.replace(options.src, ''),
          size   : html.length,
        });
      });
    };
  });

  async.parallel(tasks, callback);
}

function setupEngine ({ use }) {
  return require(use);

  // let engine = require(use);
  // let cache  = {};

  // return {
  //   compile (content) {
  //     let hashcode = md5(content);
  //     if (_.isFunction(cache[hashcode])) {
  //       return cache[hashcode];
  //     }

  //     return cache[hashcode] = engine.compile(content);
  //   },
  //   render (content, data) {
  //     return this.compile(content)(data);
  //   },
  // };
}
