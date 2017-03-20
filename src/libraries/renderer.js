import _         from 'lodash';
import fs        from 'fs-extra';
import path      from 'path';
import async     from 'async';
import { md5 }   from './utils';
import * as VARS from './variables';

export function render (pagedata, options, callback) {
  if (3 > arguments.length) {
    return render(pagedata, {}, options);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  let engine = setupEngine(options.engine.use);
  let tasks  = _.map(pagedata, function ({ data, template, output }) {
    return function (callback) {
      let html = engine.renderFile(template, _.assign({}, data, { __metadata__: pagedata }));

      fs.ensureDirSync(path.dirname(output));

      fs.writeFile(output, html, function (error) {
        if (error) {
          callback(error);
          return;
        }

        callback(null, {
          file   : output,
          assets : output.replace(VARS.ROOT_PATH, ''),
          size   : html.length,
        });
      });
    };
  });

  async.parallel(tasks, callback);
}

function setupEngine (name) {
  let _engine = require(name);
  let _cache  = {};

  if ('pug' === name) {
    return {
      compileFile (file) {
        let cache   = _cache[file];
        let state    = fs.statSync(file);
        let hsahCode = md5(file + state.size);

        if (!_.isEmpty(cache) && hsahCode === cache.hsahCode) {
          return cache.render;
        }

        let render = _engine.compileFile(file);

        _cache[file] = {
          hsahCode : hsahCode,
          render   : render,
        };

        return render;
      },
      renderFile (file, data) {
        return this.compileFile(file)(data);
      },
    };
  }
  else if ('ejs' === name) {
    return {
      compileFile (file) {
        let cache   = _cache[file];
        let state    = fs.statSync(file);
        let hsahCode = md5(file + state.size);

        if (!_.isEmpty(cache) && hsahCode === cache.hsahCode) {
          return cache.render;
        }

        let content = fs.readFileSync(file);
        let render  = _engine.compile(content);

        _cache[file] = {
          hsahCode : hsahCode,
          render   : render,
        };

        return render;
      },
      renderFile (file, data) {
        return this.compileFile(file)(data);
      },
    };
  }

  throw new Error(`however ${name} is not supported`);
}
