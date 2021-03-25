const fs = require('fs');
const utils = require('./src/utils');

const MAX_FILE_SIZE = 1024 * 1024 * 100;

const MAX_RANDOM = MAX_FILE_SIZE * 10;
// считаем одно слово в среднем сколько то байт
const MAX_NUMS_COUNT = Math.round(MAX_FILE_SIZE / 9);
const fileName = "data/bigdata.txt";

utils.deleteFile(fileName);

console.time(fileName);
const writer = fs.createWriteStream(fileName);

let canContinue = true;
writer
.on('drain', () => {
  canContinue = true;
});


let i = MAX_NUMS_COUNT; 
async function asyncRandom() {

  return new Promise((resolve) => {

    if (i < 0) {
      throw new Error("Limit exeeded.");
    } else {
      function waitDrain() {

        if (canContinue) {
          i-=1;
          resolve(utils.getRandomInt(MAX_RANDOM));
          return;
        }
        setTimeout(waitDrain, 10);
      } 
      waitDrain();
    }
  });
}

(async function () {

  let [j, n] = [0, 0];
  while (!writer.writableEnded) {

    await asyncRandom()
    .then((num) => {
      let chunck = `${num}\n`;
      canContinue = writer.write(chunck);
      n+=1;
      j+=1;
      if (j >= 100000) {
        console.log(n, "of", MAX_NUMS_COUNT, "numbers written");
        j = 0;
      }
    })
    .catch((err) => {
      writer.end();
      console.timeEnd(fileName);
      console.log(n, "numbers written");
    });
  }
})();
