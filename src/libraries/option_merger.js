import _    from 'lodash';
import path from 'path';

export class OptionMerger {
  constructor (configFile, defaultConfig, operator) {
    this._setting  = _.defaultsDeep(defaultConfig, {});
    this._operator = _.isFunction(operator) ? operator : undefined;

    this.parse(configFile);
  }

  parse (file) {
    let setting  = require(file);
    let filepath = require.resolve(file);

    this._setting   = _.defaultsDeep(setting.__esModule ? setting.default : setting, this._setting);
    this._directory = path.dirname(filepath);

    this.resolve();
  }

  config (key, value) {
    if (1 > arguments.length) {
      return this._setting;
    }

    if (2 > arguments.length) {
      if (_.isPlainObject(key)) {
        this._setting = _.defaultsDeep(key, this._setting);
        this.resolve();
        return;
      }

      return _.get(this._setting, key);
    }

    _.set(this._setting, key, value);
    this.resolve();
  }

  resolve () {
    _.isFunction(this._operator) && this._operator.call(this._setting);
  }
}
