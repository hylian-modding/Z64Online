import path from 'path';
export const VERSION_NUMBER: number = require(path.resolve(__dirname, "..", "..", 'package.json')).version;
export const BUILD_DATE: number = require(path.resolve(__dirname, "..", "..", 'package.json')).date;
