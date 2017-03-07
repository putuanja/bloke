import _         from 'lodash';
import fs        from 'fs-extra';
import path      from 'path';
import crypto    from 'crypto';
import colors    from 'colors';
import columnify from 'columnify';

export function findFiles (regexp = /\.md$/, folder, callback) {
  if (3 > arguments.length) {
    return findFiles(/\.md$/, regexp, folder);
  }

  if (!_.isFunction(callback)) {
    throw new Error('callback is not provided');
  }

  if (!fs.existsSync(folder)) {
    callback(new Error('folder is not found'));
  }

  let files = [];
  _.forEach(fs.readdirSync(folder), function (filename) {
    let file = path.join(folder, filename);

    if (fs.statSync(file).isDirectory()) {
      findFiles(regexp, file, function (error, subFiles) {
        files = files.concat(subFiles);
      });
    }
    else if (regexp.test(filename)) {
      files.push(file);
    }
  });

  callback(null, files);
}

export function md5 (source) {
  let md5sum = crypto.createHash('md5');
  md5sum.update(source);
  return md5sum.digest('hex');
}

/**
 * format size by unit
 * @param  {Number} bytes    size
 * @param  {Number} decimals
 * @return {String}
 */
export function formatBytes (bytes, decimals) {
  if (0 === bytes) {
    return '0 Bytes';
  }

  let k     = 1024;
  let dm    = decimals + 1 || 3;
  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i     = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/* istanbul ignore if */

/**
 * print stats
 */
export function trace () {
  /* eslint no-console:off */
  !process.env.SILENT && console.log.apply(console, arguments);
}

/**
 * Print results
 * @param  {Array}  stats   result set
 * @param  {Object} options columnify setting
 * @return {Boolean}
 */
export function printStats (stats, options) {
  /* istanbul ignore if */
  if (_.isEmpty(stats)) {
    return false;
  }

  options = _.defaultsDeep(options, {
    headingTransform (heading) {
      return (heading.charAt(0).toUpperCase() + heading.slice(1)).white.bold;
    },
    config: {
      assets: {
        align: 'right',
        dataTransform (file) {
          return colors.green(file).bold;
        },
      },
      size: {
        align: 'right',
        dataTransform (size) {
          return formatBytes(size);
        },
      },
    },
  });

  /* eslint no-console:off */
  trace(columnify(stats, options) + '\n');
  return true;
}

/**
 * Print results with padleft
 * @param {Array} table result set
 * @return {Boolean}
 */
export function printByPad (table) {
  /* istanbul ignore if */
  if (_.isEmpty(table)) {
    return false;
  }

  let log  = trace.bind(trace, ' ');
  let max  = 0;
  let nmax = 0;

  let messages = _.map(table, function ({ name, text }) {
    name = name.charAt(0).toUpperCase() + name.slice(1);

    let content = `${name}: ${colors.blue(text)}`;
    let size    = content.length;

    if (max < size) {
      max = size;
    }

    if (nmax < name.length) {
      nmax = name.length;
    }

    return { name, text, content, size };
  });

  log(colors.gray(_.repeat('-', max)));

  _.forEach(messages, function ({ content, name }) {
    log(_.repeat(' ', nmax - name.length) + content);
  });

  log(colors.gray(_.repeat('-', max)));

  return true;
}
