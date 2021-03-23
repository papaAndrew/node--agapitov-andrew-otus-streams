
const fs = require('fs');
const utils = require('./src/utils');

const MAX_FILE_SIZE = 1024 * 1024 * 100;

const MAX_RANDOM = MAX_FILE_SIZE * 10;
// считаем одно слово в среднем сколько то байт
const MAX_NUMS_COUNT = MAX_FILE_SIZE / 8.5;
const fileName = "data/bigdata.txt";


utils.deleteFile(fileName);

console.time(fileName);

const outFileStream = fs.createWriteStream(fileName);
//outFileStream.setEncoding('utf8')

outFileStream
.on('finish', () => {
  console.timeEnd(fileName);
})



for (let i = 0; i < MAX_NUMS_COUNT; i += 1) {

  let chunk = utils.getRandomInt(MAX_RANDOM);
  outFileStream.write(`${chunk}\n`);
}

outFileStream.end();


