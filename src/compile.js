import _                           from 'lodash';
import fs                          from 'fs-extra';
import path                        from 'path';
import async                       from 'async';
import colors                      from 'colors';
import chokidar                    from 'chokidar';
import { build as buildSiteMap }   from './libraries/sitemap';
import { compile as compileFiles } from './libraries/compiler';
import { convert }                 from './libraries/converter';
import { render }                  from './libraries/renderer';
import {
  trace,
  findFiles,
  resolvePath,
}                                  from './libraries/utils';
import { OptionMerger }            from './libraries/option_merger';
import * as VARS                   from './variables';

export function compile (folder = VARS.ROOT_PATH, options, callback) {
  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  options = _.defaultsDeep(options, {
    sitemap: 'sitemap.xml',
  });

  let rcfile      = resolvePath(options.config || './bloke.config.js', folder);
  let blogOptions = new OptionMerger(rcfile, {
    root   : VARS.ROOT_PATH,
    src    : path.join(VARS.ROOT_PATH, './posts'),
    output : path.join(VARS.ROOT_PATH, './blog'),
    ignore : [/node_modules/],
  },
  function () {
    this.src = resolvePath(this.src, this.root);
    this.output = resolvePath(this.output, this.root);
  });

  let themeOptions = new OptionMerger(options.theme || VARS.DEFAULT_THEME, {
    root      : '',
    template  : './',
    assets    : './',
    output    : blogOptions.config('output'),
    ignore    : [/node_modules/],
    renderer  : [],
    extractor : [],
    page      : {
      perPage: 10,
    },
  },
  function () {
    this.template = resolvePath(this.template, this.root);
    this.assets = resolvePath(this.assets, this.root);
  });

  let blogSetting  = blogOptions.config();
  let themeSetting = themeOptions.config();

  /**
   * start to compile files
   */
  let runCompile = function () {
    async.parallel([
      /**
       * convert markdown file to object data
       */
      function (callback) {
        findFiles(blogSetting.src, function (error, files) {
          compileFiles(files, options, function (error, metadata) {
            if (error) {
              callback(error);
              return;
            }

            let pagedata = convert(metadata, themeSetting);
            render(pagedata, _.defaultsDeep({ metadata }, themeSetting), function (error, stats) {
              if (error) {
                callback(error);
                return;
              }

              if (!options.sitemap) {
                let info = _.map(stats, function (state) {
                  return _.pick(state, ['assets', 'size']);
                });

                callback(null, info);
                return;
              }

              let files = _.map(stats, function ({ file }) {
                return file.replace(VARS.ROOT_PATH, '');
              });

              buildSiteMap(files, options.sitemapOptions, function (error, state) {
                if (error) {
                  callback(error);
                  return;
                }

                stats.push(state);

                let info = _.map(stats, function (state) {
                  return _.pick(state, ['assets', 'size']);
                });

                callback(null, info);
              });
            });
          });
        });
      },
      /**
       * copy static files
       */
      function (callback) {
        fs.exists(themeSetting.assets, function (error) {
          if (error instanceof Error) {
            callback(error);
            return;
          }

          fs.copy(themeSetting.assets, themeSetting.output, function (error) {
            if (error) {
              callback(error);
              return;
            }

            callback(null);
          });
        });
      },
    ],
    function (error, result) {
      if (error) {
        callback(error);
        return;
      }

      let [files] = result;
      callback(null, files);
    });
  };

  runCompile();

  if (true === options.watch) {
    let log     = trace.bind(`[${colors.blue('Watcher')}] `);
    let watcher = chokidar.watch(blogSetting.src);

    watcher.add(themeSetting.assets);

    watcher.on('all', function (file) {
      if ('.md' === path.extname(file)) {
        log(`'${colors.green(file)} has been created.\n'`);

        runCompile();
      }
    });

    process.on('exit', watcher.close.bind(watcher));
    process.on('SIGINT', function () {
      watcher.close();

      process.exit();
    });
  }
}
