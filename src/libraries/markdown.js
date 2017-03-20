import _          from 'lodash';
import fs         from 'fs-extra';
import path       from 'path';
import hljs       from 'highlight.js';
import async      from 'async';
import marked     from 'marked';
import trimHTML   from 'trim-html';
import * as utils from './utils';

/**
 * convert markdown to pagedata
 * @param {Array}    files    paths of files
 * @param {Object}   options  setting
 * @param {Function} callback handle after exec
 */
export function convert (files, options = {}, callback) {
  if (3 > arguments.length) {
    return convert(files, {}, options);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  let tasks = _.map(files, function (file) {
    return function (callback) {
      extract(file, options, callback);
    };
  });

  async.parallel(tasks, function (error, metadata) {
    if (error) {
      callback(error);
      return;
    }

    let pagedata = transform(metadata, options.theme);
    callback(null, pagedata);
  });
}

let cache    = {};
let renderer = new marked.Renderer();

renderer.code = function (code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    let { value } = hljs.highlight(lang, code);
    return `<pre><code class="hljs ${lang}">${value}</code></pre>`;
  }

  let { value, language } = hljs.highlightAuto(code);
  return `<pre><code class="hljs ${language}">${value}</code></pre>`;
};

marked.setOptions({
  gfm      : true,
  pedantic : false,
  sanitize : false,
  renderer : renderer,
});

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
export function transform (metadata, options) {
  options = _.defaultsDeep(options, {
    extractor: [
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
        name : 'categories',
        cite : 'category',
        resolve : function (item) {
          return (item.category || '').split(',');
        },
      },
      {
        name : 'authors',
        cite : 'author',
      },
    ],
  });

  metadata = _.sortBy(metadata, true, 'date');

  let extracted = {};
  _.forEach(options.extractor, function (extractor) {
    let source = pack(metadata, extractor);
    extracted  = _.assign(extracted, source);
  });

  return serialize(extracted, options.renderer, options);
}

function pack (metadatas, extractor) {
  let { name, cite, resolve } = extractor;
  let datas                   = {};

  _.forEach(metadatas, function (metadata, index) {
    if (_.isUndefined(cite)) {
      append(undefined, metadata, name, datas, Array);
      return;
    }

    let key = metadata[cite];

    if (_.isFunction(resolve)) {
      let chunk = resolve(metadata, index);

      if (_.isArray(chunk)) {
        _.forEach(chunk, function (cell) {
          append(cell, metadata, name, datas);
        });
      }
      else {
        append(chunk, metadata, name, datas);
      }
    }
    else {
      append(key, metadata, name, datas);
    }
  });

  return datas;

  function append (name, value, chunkName, group, DefaultClass = Object) {
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
      append(undefined, value, name, chunk, Array);
    }
  }
}

function serialize (source, renderers, options) {
  let datas = _.map(renderers, function ({ template, output, picker }) {
    template = utils.resolvePath(template, options.template);

    if (_.isFunction(picker)) {
      let pagedata = picker(source, options.page);

      if (!_.isArray(pagedata)) {
        pagedata = [pagedata];
      }

      _.forEach(pagedata, function (item) {
        item.template = utils.resolvePath(item.template || template, options.template);
        item.output   = utils.resolvePath(item.output, options.output);
      });

      return _.defaultsDeep(pagedata, { data: {} });
    }

    if (!_.isEmpty(output)) {
      output = utils.resolvePath(output, options.output);

      let data = _.pick(source, _.isArray(picker) ? picker : [picker]);
      return { template, output, data };
    }
  });

  datas = _.flattenDeep(datas);
  return _.filter(datas);
}

/**
 * extract data from mardown file
 * @param  {String}   file          markdown file
 * @param  {Object}   options       setting
 * @param  {Boolean}  options.cache cache data
 * @param  {Function} callback call after excute
 */
export function extract (file, options = {}, callback) {
  if (3 > arguments.length) {
    return extract(file, {}, options);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  if (!fs.existsSync(file)) {
    callback(new Error(`${file} is not found`));
    return;
  }

  options = _.defaultsDeep(options, {
    cache   : true,
    charset : 'utf8',
  });

  let state = fs.statSync(file);
  if (state.isDirectory()) {
    callback(new Error(`${file} is a directory`));
    return;
  }

  let hashcode = utils.md5(file + state.size + state.mtime);
  if (_.isObject(cache[hashcode])) {
    callback(null, cache[hashcode]);
    return;
  }

  let source   = fs.readFileSync(file, options.charset);
  let metadata = analysis(source);
  let data     = format(metadata, options.formatter);

  source = source
  .replace(/<!--.*?-->/ig, '')
  .replace(/\n{2,}/g, '');

  source = _.trim(source);

  let html    = marked(source) || '';
  let summary = html
  .replace(/\n/g, '\\n')
  .replace(/\r/g, '\\r')
  .replace(/\t/g, '\\t');

  summary = trimHTML(summary, { limit: 200 });

  data.hashcode = hashcode;
  data.markdown = file;
  data.html     = html;
  data.summary  = summary.html
  .replace(/\\n/g, '\n')
  .replace(/\\r/g, '\r')
  .replace(/\\t/g, '\t');

  if (_.isEmpty(data.title)) {
    let filename = path.basename(file);
    data.title   = filename.replace(path.extname(file), '');
  }

  data = _.defaultsDeep(data, {
    tag      : '',
    category : '',
    author   : '',
  });

  callback(null, cache[hashcode] = data);
}

function format (metadata, formatter = {}) {
  metadata = _.clone(metadata);

  _.forEach(formatter, function (fn, name) {
    if (metadata.hasOwnProperty(name) && _.isFunction(fn)) {
      metadata[name] = fn(metadata[name]);
    }
  });

  return metadata;
}

function analysis (source, regexp = /<!--\s*([\w\d]+?):\s*([\w\W]+?)\s*-->/) {
  let [metadata, matched] = [{}];

  while (matched = regexp.exec(source)) {
    let [all, name, value] = matched;
    metadata[name]         = value;
    source                 = source.replace(all, '');
  }

  return metadata;
}
