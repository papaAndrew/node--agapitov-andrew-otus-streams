const fs = require('fs');
const utils = require('./src/utils');


/*
1. читаем из Readeble
2. пишем в Writeble
3. если считано 20М, вычисляем конец записи и хвост
4. создаем новый Writeble и пишем в него хвост
5. продолжаем пайпить до п.3 
*/

const MAX_NUMS_COUNT = 100000;
const MAX_CHUNK_SIZE = 1024 * 16;
const opts = { highWaterMark: MAX_CHUNK_SIZE };


/**
 * Сортировка и запись массива в поток кусками по MAX_CHUNK_SIZE. 
 * Возвращает пустой пул
 * @param {Writable} stream
 * @param {Array} nums 
 */
function sortAndSave(pool, stream) {
  // сортируем пул
  pool.sort((a, b) => Number(a) - Number(b));
  
  let chunk = "";
  pool.forEach((item) => {

    chunk = chunk.concat(`${item}\n`);

    if (chunk.length > MAX_CHUNK_SIZE) {

      chunk = Buffer.from(`${chunk}`, 'utf8');
      stream.write(chunk);
      chunk = "";
    }
  });
  chunk = Buffer.from(`${chunk}`, 'utf8');
  stream.write(chunk);
  // пустой пул
  return [];
}

// входной поток
const req = fs.createReadStream("data/bigdata.txt", opts);

// накопитель выходных пишущих потоков, чтобы не дожидаться завершения каждого 
let streams = [];
// пул для сортировки чисел
let pool = [];
// сшиватель данных, приносимых чанками
let data = "";
//счетчик файлов
let i = 0;
// выходной файл
let outFileName = `data/sorted/sorted${i}`; 

// открываем поток
utils.deleteFile(outFileName);
streams.push(fs.createWriteStream(outFileName, opts));
let res = streams[i];

req
  .on('data', (chunk) => {
    // склеиваем остаток от предыдущей чанки
    data = data.concat(chunk.toString());
    // парсим чанку и добавляем в пул
    pool = pool.concat(data.split(`\n`));
    // отрезаем хвост, который может быть куском числа 
    [data] = pool.splice(pool.length - 1, 1);
     
    // если пул заполнен
    if (pool.length >= MAX_NUMS_COUNT) {
      // сортируем, сохраняем и ресетим
      pool = sortAndSave(pool, res);
        
      // создаем новый файл
      i += 1;
      outFileName = `data/sorted/sorted${i}`; 
      utils.deleteFile(outFileName);
      streams.push(fs.createWriteStream(outFileName, opts));
      res = streams[i];
    }
  })
  .on('end', () => {

    // остатки
    pool.push(data);
    // сортируем и сохраняем
    sortAndSave(pool, res);
    
    streams.forEach(res => {
      res.end();  
    });
  });

  

    