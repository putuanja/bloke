import _                from 'lodash';
import fs               from 'fs-extra';
import path             from 'path';
import async            from 'async';
import { md5 }          from './utils';
import { includeTheme } from './converter';
import * as VARS        from '../variables';

export function render (pagedata, options, callback) {
  let theme          = includeTheme(options.theme);
  let { renderFile } = setupEngine(theme.config.engine.use);

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

function setupEngine (name) {
  let _engine = require(name);
  let _cache  = {};

  if ('pug' === name) {
    return {
      compile (file) {
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
      render (file, data) {
        return this.compile(file)(data);
      },
    };
  }
  else if ('ejs' === name) {
    return {
      compile (file) {
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
      render (file, data) {
        return this.compile(file)(data);
      },
    };
  }

  throw new Error(`however ${name} is not supported`);
}
