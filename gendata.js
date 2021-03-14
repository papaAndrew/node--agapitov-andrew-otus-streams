
const fs = require('fs');
const utils = require('./src/utils');

const MAX_RANDOM = 1000000000;
const MAX_NUMS_COUNT = 1000000;
const fileName = "data/bigdata.txt";


utils.deleteFile(fileName);

const outFileStream = fs.createWriteStream(fileName);
//outFileStream.setEncoding('utf8')

outFileStream.on('finish', () => {
  console.log('All writes are now complete.');
})


for (let i = 0; i < MAX_NUMS_COUNT; i += 1) {

  let chunk = utils.getRandomInt(MAX_RANDOM);
  outFileStream.write(`${chunk}\n`);
}

outFileStream.end();


