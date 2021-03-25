const fs = require('fs');
const utils = require('./src/utils');
const { SplitWriter } = require('./src/SplitWriter');

const srcFileName = "data/bigdata.txt";
const dstFolderName = "data/sorted";


const writer = new SplitWriter(dstFolderName);
writer.on('finish', () => console.timeEnd(dstFolderName));

console.time(dstFolderName);

const reader = fs.createReadStream(srcFileName);
reader.pipe(writer);