import _                         from 'lodash';
import path                      from 'path';
import colors                    from 'colors';
import program                   from 'commander';
import { compile }               from './compile';
import { server }                from './server';
import {
  trace,
  printStats,
  printByPad,
}                                from './libraries/utils';
import { build as buildSiteMap } from './libraries/sitemap';
import { version }               from '../package.json';
import * as VARS                 from './variables';

program
.version(version);

program
.usage('<folder> [options]')
.arguments('<folder>')
.option('-t, --theme <folder[, name]>', 'set theme folder or theme name (default is default theme)')
.option('-o, --output <folder>', 'set output folder')
.option('--sitemap', 'set sitemap file')
.option('--sitemap-options', 'set sitemap build config')
.option('--server', 'open dev server')
.option('--server-port', 'set server port')
.option('--webpack <config file>', 'set webpack config (default root webpack)')
.option('--watch', 'listen file changed')
.action(function (folder, options) {
  let pwd       = path.join(process.cwd(), folder);
  let startTime = Date.now();

  /**
   * compile markdown to HTML
   */
  compile(pwd, options, function (error, stats) {
    if (error) {
      throw error;
    }

    let files = _.map(stats, function ({ file }) {
      return file.replace(VARS.DISTRICT_PATH, '');
    });

    let sitemapConfig = _.defaultsDeep(options.sitemapOptions, { output: options.sitemap });

    buildSiteMap(files, sitemapConfig, function (error, sitemapState) {
      stats.push(sitemapState);

      trace('Compiler: Markdown');
      trace(`Time: ${colors.bold(colors.white(Date.now() - startTime))}ms\n`);

      let info = _.map(stats, function (state) {
        return _.pick(state, ['assets', 'size']);
      });

      printStats(info);
    });
  });

  /**
   * watch and create server
   */
  if (options.server) {
    trace(colors.bold(colors.white('Access URLs:')));

    server({
      root : options.output && (path.isAbsolute(options.output) ? options.output : path.join(pwd, options.output)),
      port : options.serverPort || 9871,
    },
    function (error, server, stats) {
      if (error) {
        throw error;
      }

      printByPad(stats);
    });
  }
});

program.parse(process.argv);
