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
import { version }               from '../package.json';
import { resolvePath }           from './libraries/utils';

let log = trace.bind(`[${colors.cyan('BK')}] `);

program
.version(version);

program
.usage('<folder> [options]')
.arguments('<folder>')
.option('--output <folder>', 'set output folder')
.option('--config <file>', 'set bloke config file')
.option('--sitemap', 'set sitemap file')
.option('--sitemap-options', 'set sitemap build config')
.option('--server', 'open dev server')
.option('--server-port', 'set server port')
.option('--webpack <config file>', 'set webpack config (default root webpack)')
.option('--watch', 'listen file changed')
.action(function (folder, options) {
  let pwd       = path.join(process.cwd(), folder);
  let startTime = Date.now();

  if (options.sitemapOptions) {
    try {
      options.sitemapOptions = JSON.parse(options.sitemapOptions);
    }
    catch (err) {
      log(colors.yellow('sitemap-options is invalid'));

      options.sitemapOptions = {};
    }
  }

  /**
   * compile markdown to HTML
   */
  compile(pwd, options, function (error, stats) {
    if (error) {
      throw error;
    }

    trace('Compiler: Markdown');
    trace(`Time: ${colors.bold(colors.white(Date.now() - startTime))}ms\n`);

    printStats(stats);
  });

  /**
   * watch and create server
   */
  if (options.server) {
    trace(colors.bold(colors.white('Access URLs:')));

    server({
      root : options.output && resolvePath(options.output, pwd),
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
