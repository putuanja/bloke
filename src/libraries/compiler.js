import _        from 'lodash';
import fs       from 'fs-extra';
import path     from 'path';
import hljs     from 'highlight.js';
import async    from 'async';
import marked   from 'marked';
import trimHTML from 'trim-html';
import { md5 }  from './utils';

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
 * covert folder to datas
 * @param  {String}   folder        folder with markdown files
 * @param  {Object}   options       setting
 * @param  {Boolean}  options.cache cache data
 * @param  {Function} callback call after excute
 */
export function compile (files, options = {}, callback) {
  if (3 > arguments.length) {
    return compile(files, {}, options);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  let tasks = _.map(files, function (file) {
    return function (callback) {
      compileFile(file, options, callback);
    };
  });

  async.parallel(tasks, callback);
}

/**
 * covert mardown file to datas
 * @param  {String}   file          markdown file
 * @param  {Object}   options       setting
 * @param  {Boolean}  options.cache cache data
 * @param  {Function} callback call after excute
 */
export function compileFile (file, options = {}, callback) {
  if (3 > arguments.length) {
    return compileFile(file, {}, options);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  if (!fs.existsSync(file)) {
    callback(new Error(`${file} is not found`));
    return;
  }

  options = _.defaultsDeep(options, {
    cache: true,
  });

  let state = fs.statSync(file);
  if (state.isDirectory()) {
    callback(new Error(`${file} is a directory`));
    return;
  }

  let lastTime = state.mtime;
  let hashcode = md5(file + state.size + lastTime);
  if (_.isObject(cache[hashcode])) {
    callback(null, cache[hashcode]);
    return;
  }

  let buffer   = fs.readFileSync(file);
  let source   = buffer.toString();
  let metadata = analysisMetadata(source);
  let data     = formatMetadata(metadata, options.formatter);

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

function formatMetadata (metadata, formatter = {}) {
  metadata = _.clone(metadata);

  _.forEach(formatter, function (format, name) {
    if (metadata.hasOwnProperty(name) && _.isFunction(format)) {
      metadata[name] = format(metadata[name]);
    }
  });

  return metadata;
}

function analysisMetadata (source) {
  let [metadata, matched] = [{}];

  while (matched = /<!--\s*([\w\d]+?):\s*([\w\W]+?)\s*-->/.exec(source)) {
    let [all, name, value] = matched;
    metadata[name]         = value;
    source                 = source.replace(all, '');
  }

  return metadata;
}
