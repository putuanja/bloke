import _             from 'lodash';
import fs            from 'fs-extra';
import path          from 'path';
import async         from 'async';
import colors        from 'colors';
import chokidar      from 'chokidar';
import * as server   from './libraries/server';
import * as sitemap  from './libraries/sitemap';
import * as markdown from './libraries/markdown';
import * as renderer from './libraries/renderer';
import * as utils    from './libraries/utils';
import * as VARS     from './libraries/variables';

/**
 * compile markdown file to html files
 * @param  {String}   folder   path of folder
 * @param  {String}   output   path of output
 * @param  {Object}   options  setting
 * @param  {Function} callback handle after exec
 */
export function compile (folder = VARS.ROOT_PATH, output = VARS.DISTRICT_PATH, options, callback) {
  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  let transformFile = (callback) => {
    async.waterfall([
      utils.findFiles.bind(null, options.bloke.src),
      function (files, callback) {
        markdown.convert(files, options, callback);
      },
      function (pagedata, callback) {
        renderer.render(pagedata, options.theme, callback);
      },
      function (stats, callback) {
        if (!options.sitemap) {
          callback(null, stats);
          return;
        }

        let files = _.map(stats, function ({ file }) {
          return file.replace(folder, '');
        });

        sitemap.build(files, options.sitemapOptions, function (error, sitemapStats) {
          if (error) {
            callback(error);
            return;
          }

          stats.push(sitemapStats);
          callback(null, stats);
        });
      },
    ], callback);
  };

  let copyStatic = (callback) => {
    let assets = options.theme.assets;
    assets = _.isArray(assets) ? assets : [assets];

    let tasks = _.map(assets, function (folder) {
      return function (callback) {
        fs.exists(folder, function (error) {
          if (error instanceof Error) {
            callback(error);
            return;
          }

          let name = path.basename(folder);
          fs.copy(folder, path.join(options.theme.output, name), function (error) {
            if (error) {
              callback(error);
              return;
            }

            callback(null);
          });
        });
      };
    });

    async.parallel(tasks, callback);
  };

  let start = (done) => {
    async.parallel([
      transformFile,
      copyStatic,
    ],
    function (error, result) {
      if (error) {
        callback(error);
        return;
      }

      let [files] = result;
      callback(null, files);

      _.isFunction(done) && done();
    });
  };

  start(function () {
    if (true === options.watch) {
      let log     = utils.trace.bind(`[${colors.blue('Watcher')}] `);
      let watcher = chokidar.watch(options.bloke.src);

      watcher.add(options.theme.assets);

      watcher.on('all', function (file) {
        if ('.md' === path.extname(file)) {
          log(`'${colors.green(file)} has been created.\n'`);

          start();
        }
      });

      process.on('exit', watcher.close.bind(watcher));
      process.on('SIGINT', function () {
        watcher.close();

        process.exit();
      });
    }

    if (true === options.server) {
      utils.trace(colors.bold(colors.white('Access URLs:')));

      server({
        root : options.bloke.output,
        port : options.serverPort || 9871,
      },
      function (error, server, stats) {
        if (error) {
          throw error;
        }

        utils.printByPad(stats);
      });
    }
  });
}
