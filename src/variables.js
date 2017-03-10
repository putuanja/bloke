import path from 'path';

export const ROOT_PATH      = process.cwd();
export const EXECUTE_PATH   = path.join(__dirname, '../');
export const RESOURCE_PATH  = path.join(EXECUTE_PATH, './src');
export const DISTRICT_PATH  = path.join(ROOT_PATH, './dist');
export const TEMPORARY_PATH = path.join(EXECUTE_PATH, './.temporary');
export const DEFAULT_THEME  = 'bloke-theme-sharp';
