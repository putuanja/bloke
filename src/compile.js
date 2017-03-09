import _                           from 'lodash';
import fs                          from 'fs-extra';
import path                        from 'path';
import colors                      from 'colors';
import chokidar                    from 'chokidar';
import { compile as compileFiles } from './libraries/compiler';
import {
  convertTheme,
  includeTheme,
}                                  from './libraries/converter';
import { render }                  from './libraries/renderer';
import {
  trace,
  findFiles,
}                                  from './libraries/utils';
import * as VARS                   from './variables';

export function compile (folder = VARS.ROOT_PATH, options, callback) {
  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  /**
   * read rc file to load config
   */
  let rc = path.join(folder, './.blogrc');
  if (fs.existsSync(rc)) {
    let _options = fs.readJSONSync(rc);
    options = _.defaultsDeep(options, _options);
  }

  /**
   * set default config
   */
  options = _.defaultsDeep(options, {
    assets : folder,
    output : VARS.DISTRICT_PATH,
    posts  : '.',
    theme  : VARS.DEFAULT_THEME,
  });

  if (!path.isAbsolute(options.posts)) {
    options.posts = path.join(options.assets, options.posts);
  }

  /**
   * load theme config
   */
  let theme = includeTheme(options.theme);

  findFiles(options.posts, function (error, files) {
    if (error) {
      callback(error);
      return;
    }

    convert(files, options, callback);

    if (true === options.watch) {
      let log      = trace.bind(null, `[${colors.blue('Watcher')}] `);
      let watcher  = chokidar.watch(options.posts);
      let oriFiles = _.clone(files) || [];
      let oriSizes = _.map(files, function (file) {
        return fs.statSync(file).size;
      });

      watcher.on('add', function (file) {
        if ('.md' === path.extname(file) && -1 === _.find(oriFiles, file)) {
          log(`'${colors.green(file)} has been created.\n'`);

          oriFiles.push(file);
          oriSizes.push(fs.statSync(file).size);
          watcher.add(file);
        }
      });

      watcher.on('unlink', function (file) {
        let index = _.indexOf(oriFiles, file);

        if (-1 !== index) {
          log(`'${colors.green(file)} has been removed.\n'`);

          oriFiles.splice(index, 1);
          oriSizes.splice(index, 1);
          watcher.unwatch(file);
        }
      });

      watcher.on('change', function (file) {
        fs.stat(file, function (error, stat) {
          if (error) {
            return;
          }

          let index = _.indexOf(oriFiles, file);
          if (-1 !== index && oriSizes[index] !== stat.size) {
            log(`'${colors.green(file)}' has been changed.\n`);
            convert(files, options, callback);
          }
        });
      });

      process.on('exit', watcher.close.bind(watcher));
      process.on('SIGINT', function () {
        watcher.close();
        process.exit();
      });
    }
  });

  function convert (files, options, callback) {
    /**
     * convert markdown file to object data
     */
    compileFiles(files, options, function (error, metadata) {
      if (error) {
        callback(error);
        return;
      }

      /**
       * convert meta data according to theme config
       */
      let setting = _.assign({
        assets : theme.assets,
        output : options.output,
      }, theme.config);

      let pagedata = convertTheme(metadata, setting);

      /**
       * render page data
       */
      render(pagedata, {
        metadata : metadata,
        theme    : options.theme,
      }, callback);
    });
  }
}
