import _             from 'lodash';
import fs            from 'fs-extra';
import path          from 'path';
import * as VARS     from '../variables';
import { quickSort } from './utils';

/**
 * load theme config
 * @param  {String} theme theme name or theme folder
 * @return {Object}
 */
export function includeTheme (theme = 'default') {
  let index  = _.indexOf(VARS.LOCAL_THEME, theme);
  let folder = theme;

  if (-1 !== index) {
    let name = VARS.LOCAL_THEME[index];
    folder = path.join(VARS.LOCAL_THEME_PATH, name);
  }

  if (!fs.existsSync(folder)) {
    throw new Error(`theme folder '${folder}' is not exists, you can try to reinstall or change theme`);
  }

  let config = require(path.join(folder, './config.js'));
  config     = config.__esModule ? config.default : config;

  return { assets: folder, config };
}

/**
 * convert meta data according to theme config
 * @param  {Array}   metadata             source
 * @param  {Object}  options              setting
 * @param  {String}  options.assets       theme base path
 * @param  {String}  options.output       output folder
 * @param  {Object}  options.page         page setting
 * @param  {Integer} options.page.perpage show data per page (default 10)
 * @return {Object}
 */
export function convertTheme (metadata, options) {
  options = _.mergeWith({
    assets    : './',
    output    : VARS.DISTRICT_PATH,
    renderer  : [],
    extractor : [
      {
        name: 'articles',
      },
      {
        name : 'tags',
        cite : 'tag',
        resolve : function (item) {
          return (item.tag || '').split(',');
        },
      },
      {
        name : 'archives',
        cite : 'category',
      },
      {
        name : 'authors',
        cite : 'author',
      },
    ],
    page      : {
      perPage: 10,
    },
  },
  options, function (objValue, srcValue) {
    if (_.isArray(objValue)) {
      return objValue.concat(srcValue);
    }
  });

  /**
   * sort by datetime desc
   */
  metadata = quickSort(metadata, true, 'date');

  let extracted = {};
  _.forEach(options.extractor, function (extractor) {
    let source = extract(metadata, extractor);
    extracted  = _.assign(extracted, source);
  });

  return serialize(extracted, options.renderer, options);
}

/**
 * according to extractor,
 * extract and serialize metadata to a
 * new format data
 * @param  {Array} metadatas  source
 * @param  {Array} extractor  extract setting
 * @return {Object}
 */
function extract (metadatas, extractor) {
  let { name, cite, resolve } = extractor;
  let datas = {};

  _.forEach(metadatas, function (metadata, index) {
    if (_.isUndefined(cite)) {
      setItem(undefined, metadata, name, datas, Array);
      return;
    }

    let key = metadata[cite];

    if (_.isFunction(resolve)) {
      let chunk = resolve(metadata, index);

      if (_.isArray(chunk)) {
        _.forEach(chunk, function (cell) {
          setItem(cell, metadata, name, datas);
        });
      }
      else {
        setItem(chunk, metadata, name, datas);
      }
    }
    else {
      setItem(key, metadata, name, datas);
    }
  });

  return datas;

  function setItem (name, value, chunkName, group, DefaultClass = Object) {
    if (!_.isString(chunkName)) {
      return;
    }

    let chunk = group[chunkName];

    if (!chunk) {
      chunk = group[chunkName] = new DefaultClass();
    }

    if (_.isArray(chunk)) {
      chunk.push(value);
    }
    else if (_.isObject(chunk)) {
      setItem(undefined, value, name, chunk, Array);
    }
  }
}

/**
 * addcording to renderer in theme config,
 * transform data to new format data
 * @param  {Object}  source               extracted datas
 * @param  {Array}   renderers            theme config renderers
 * @param  {Object}  options              setting
 * @param  {String}  options.assets       theme base path
 * @param  {String}  options.output       output folder
 * @param  {Object}  options.page         page setting
 * @param  {Integer} options.page.perpage show data per page (default 10)
 * @return {Object}
 */
function serialize (source, renderers, options) {
  let datas = _.map(renderers, function ({ template, output, picker }) {
    if (!path.isAbsolute(template)) {
      template = path.join(options.assets, template);
    }

    if (_.isFunction(picker)) {
      let pagedata = picker(source, options.page);

      if (!_.isArray(pagedata)) {
        pagedata = [pagedata];
      }

      _.forEach(pagedata, function (item) {
        item.template = template;

        if (!path.isAbsolute(item.output)) {
          item.output = path.join(options.output, item.output);
        }
      });

      return _.defaultsDeep(pagedata, { data: {} });
    }

    if (!_.isEmpty(output)) {
      if (!path.isAbsolute(output)) {
        output = path.join(options.output, output);
      }

      let data = _.pick(source, _.isArray(picker) ? picker : [picker]);
      return { template, output, data };
    }
  });

  datas = _.flattenDeep(datas);
  return _.filter(datas);
}
