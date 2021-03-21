const fs = require('fs');
const utils = require('./src/utils');
const { MergeReader } = require('./src/MergeReader');


const dstFileName = "data/reader-out";
utils.deleteFile(dstFileName);
const writer = fs.createWriteStream(dstFileName);

const srcFolderName = "data/sorted";
const reader = new MergeReader(srcFolderName);
reader.pipe(writer);
