import path from 'path';
export const VERSION_NUMBER: string = require(path.resolve(__dirname, "..", "..", 'package.json')).version;
export const BUILD_DATE: string = require(path.resolve(__dirname, "..", "..", 'package.json')).date;
export const COMMIT: string = require(path.resolve(__dirname, "..", "..", 'package.json')).commit;
