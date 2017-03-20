import _           from 'lodash';
import path        from 'path';
import colors      from 'colors';
import program     from 'commander';
import { compile } from './compiler';
import * as utils  from './libraries/utils';
import * as VARS   from './libraries/variables';
import { version } from '../package.json';

let log = utils.trace.bind(`[${colors.cyan('BK')}] `);

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
.option('--webpack <config file>', 'set webpack config (default root webpack)')
.option('--watch', 'listen file changed')
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
  }, pwd);

  let themeSetting = loadThemeRC(blokeSetting.theme, {
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
  });
}

function loadRC (file, defaultSetting, folder = VARS.ROOT_PATH) {
  let setting = require(file);
  let options = _.defaultsDeep(defaultSetting, setting);

  if (options.src) {
    options.src = utils.resolvePath(options.src, folder);
  }

  if (options.output) {
    options.output = utils.resolvePath(options.output, folder);
  }

  return options;
}

function loadThemeRC (file, defaultSetting) {
  let setting = require(file);
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
