import path from 'path';

export const EXECUTE_PATH     = path.join(__dirname, '../');
export const ROOT_PATH        = process.cwd();
export const RESOURCE_PATH    = path.join(EXECUTE_PATH, './src');
export const DISTRICT_PATH    = path.join(ROOT_PATH, './dist');
export const LOCAL_THEME_PATH = path.join(RESOURCE_PATH, './theme');
export const LOCAL_THEME      = ['default'];
export const TEMPORARY_PATH   = path.join(EXECUTE_PATH, './.temporary');
