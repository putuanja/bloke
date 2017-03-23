import _           from 'lodash';
import fs          from 'fs-extra';
import path        from 'path';
import colors      from 'colors';
import program     from 'commander';
import chokidar    from 'chokidar';
import handlebars  from 'handlebars';
import { compile } from './compiler';
import * as utils  from './libraries/utils';
import * as VARS   from './libraries/variables';
import * as server from './libraries/server';
import { version } from '../package.json';

let log = utils.trace.bind(null, `[${colors.cyan('BK')}]`);

program
.version(version);

program
.usage('<folder> [options]')
.arguments('<folder>')
.option('--config <file>', 'set bloke config file')
.option('--sitemap', 'set sitemap file')
.option('--sitemap-options', 'set sitemap build config')
.option('--server', 'open dev server')
.option('--server-port', 'set server port')
.option('--watch', 'listen file changed')
.option('--deploy', 'use Travis CI to deploy to github')
.action(compileAction);

program
.parse(process.argv);

function compileAction (folder = VARS.ROOT_PATH, params) {
  let pwd       = path.join(process.cwd(), folder);
  let startTime = Date.now();

  let rcFile       = utils.resolvePath(params.config || './bloke.config.js', pwd);
  let blokeSetting = loadRC(rcFile, {
    root   : pwd,
    src    : path.join(pwd, './posts'),
    output : path.join(pwd, './blog'),
    ignore : [/node_modules/],
    theme  : VARS.DEFAULT_THEME,
    deploy : {
      source  : './blog',
      release : './.launch',
      apikey  : '',
      email   : '',
    },
  }, pwd);

  let themeSetting = loadThemeRC(blokeSetting.theme.use, {
    root      : VARS.ROOT_PATH,
    template  : path.join(VARS.ROOT_PATH, './template'),
    assets    : path.join(VARS.ROOT_PATH, './assets'),
    ignore    : [/node_modules/],
    renderer  : [],
    extractor : [],
    page      : {
      perPage: 10,
    },
  });

  themeSetting.output = blokeSetting.output;

  let sitemapSetting = {};
  if (params.sitemapOptions) {
    try {
      sitemapSetting = JSON.parse(params.sitemapOptions);
    }
    catch (err) {
      log(colors.yellow('sitemap-options is invalid'));
      sitemapSetting = {};
    }
  }

  sitemapSetting = _.defaultsDeep(sitemapSetting, {
    output: path.join(blokeSetting.output, './sitemap.xml'),
  });

  if (sitemapSetting.output) {
    utils.resolvePath(sitemapSetting.output, blokeSetting.output);
  }

  let startCompile = function (done) {
    log(`clean up ${colors.green(blokeSetting.output)} ...`);
    fs.removeSync(blokeSetting.output);

    compile(pwd, VARS.DISTRICT_PATH, {
      bloke   : blokeSetting,
      theme   : themeSetting,
      sitemap : sitemapSetting,
    },
    function (error, stats) {
      if (error) {
        throw error;
      }

      utils.trace('Compiler: Markdown');
      utils.trace(`Time: ${colors.bold(colors.white(Date.now() - startTime))}ms\n`);

      stats = _.map(stats, function ({ assets, size }) {
        return { assets, size };
      });

      utils.printStats(stats);

      _.isFunction(done) && done();
    });
  };

  startCompile(function () {
    if (true === params.watch) {
      let watcher = chokidar.watch(blokeSetting.src);

      watcher.add(themeSetting.assets);

      watcher.on('all', function (file) {
        if ('.md' === path.extname(file)) {
          log(`'${colors.green(file)} has been created.\n'`);

          startCompile();
        }
      });

      process.on('exit', watcher.close.bind(watcher));
      process.on('SIGINT', function () {
        watcher.close();
        process.exit();
      });
    }

    if (true === params.server) {
      utils.trace(colors.bold(colors.white('Access URLs:')));

      server.start({
        root : blokeSetting.output,
        port : params.serverPort || 9871,
      },
      function (error, server, stats) {
        if (error) {
          throw error;
        }

        utils.printByPad(stats);
      });
    }
  });

  if (params.deploy && !params.server && !params.watch) {
    let template = path.join(VARS.EXECUTE_PATH, './template/deploy.sh');
    let output   = path.join(VARS.ROOT_PATH, './deploy.sh');
    let source   = fs.readFileSync(template);
    let render   = handlebars.compile(source.toString());
    let content  = render(blokeSetting.deploy);

    fs.writeFileSync(output, content);
  }
}

function loadRC (file, defaultSetting, folder = VARS.ROOT_PATH) {
  let setting = require(file);
  let options = _.defaultsDeep(setting, defaultSetting);

  if (options.src) {
    options.src = utils.resolvePath(options.src, folder);
  }

  if (options.output) {
    options.output = utils.resolvePath(options.output, folder);
  }

  if (!options.deploy.root) {
    options.deploy.root = options.output.replace(options.root, '');
  }

  return options;
}

function loadThemeRC (file, defaultSetting) {
  let setting = require(path.join(VARS.ROOT_PATH, './node_modules', file));
  let options = _.defaultsDeep(setting, defaultSetting);

  if (options.template) {
    options.template = utils.resolvePath(options.template, options.root);
  }

  if (options.assets) {
    if (_.isArray(options.assets)) {
      options.assets = _.map(options.assets, function (assets) {
        return utils.resolvePath(assets, options.root);
      });
    }
    else {
      options.assets = utils.resolvePath(options.assets, options.root);
    }
  }

  return options;
}
