const fs = require('fs');
const utils = require('./src/utils');
const { SplitTransform } = require('./src/SplitReader');
const { MergeReader } = require('./src/MergeReader');


const srcFileName = "data/bigdata.txt";
const dstFolderName = "data/sorted";
const tr = new SplitTransform(dstFolderName);

tr.split(srcFileName);

/*
const dstFileName = "data/reader-out";
utils.deleteFile(dstFileName);
const writer = fs.createWriteStream(dstFileName);

const srcFolderName = "data/sorted";
const reader = new MergeReader(srcFolderName);
reader.pipe(writer);
*/