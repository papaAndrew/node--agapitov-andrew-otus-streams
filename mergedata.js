const fs = require('fs');
const utils = require('./src/utils');
const { MergeReader } = require('./src/MergeReader');


const dstFileName = "data/sorted.bigdata.txt";
utils.deleteFile(dstFileName);
const writer = fs.createWriteStream(dstFileName);
writer.on('finish', () => console.timeEnd(dstFileName));

console.time(dstFileName);

const srcFolderName = "data/sorted";
const reader = new MergeReader(srcFolderName);
reader.pipe(writer);

