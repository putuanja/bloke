import _                 from 'lodash';
import path              from 'path';
import colors            from 'colors';
import program           from 'commander';
import { compile }       from './compile';
import { server }        from './server';
import {
  trace,
  printStats,
  printByPad,
}                        from './libraries/utils';
import { version }       from '../package.json';

program
.version(version);

program
.usage('<folder> [options]')
.arguments('<folder>')
.option('-t, --theme <folder[, name]>', 'set theme folder or theme name (default is default theme)')
.option('-o, --output <folder>', 'set output folder')
.option('--server', 'open dev server')
.option('--serverPort', 'set server port')
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

    trace('Compiler: Markdown');
    trace(`Time: ${colors.bold(colors.white(Date.now() - startTime))}ms\n`);

    let info = _.map(stats, function (state) {
      return _.pick(state, ['assets', 'size']);
    });

    printStats(info);

    /**
     * watch and create server
     */
    if (options.watch && options.server) {
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
});

program.parse(process.argv);
