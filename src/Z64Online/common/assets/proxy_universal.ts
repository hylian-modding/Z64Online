import fs from 'fs';
import path from 'path';
export const proxy_universal: Buffer = fs.readFileSync(path.join(__dirname, "proxy_universal.zobj"));
