
const { Readable } = require('stream');
const fs = require('fs');
const utils = require('./utils');



const MAX_QUE_LEN = 100000;
const BUFFER_SIZE = 1024 * 16;

const DELIM_EOL = `\n`;


class SplitTransform {

  constructor(dstDirName) {

    this._data = "";
    this._queue = [];
    this._dstCount = 0

    this._dstName = dstDirName;
    this._writer = this._createWriter();

    this._srcName;
    this._reader;
  }

  _createWriter() {
    // создаем новый файл
    let fileName = `${this._dstName}/sorted${this._dstCount}`; 
    utils.deleteFile(fileName);

    this._dstCount+=1;

    return fs.createWriteStream(fileName, { highWaterMark: BUFFER_SIZE });
  }

  _createReader() {
    // чтобы в очередь добавлялись только валидные значения, без мусора
    const numbersOnly = utils.canBeNumeric;

    const stream = fs.createReadStream(this._srcName,  { highWaterMark: BUFFER_SIZE });
    return stream
    .on('data', (chunk) => {
      //console.log("onData called");
      // склеиваем остаток от предыдущей чанки
      this._data = this._data.concat(chunk.toString());
      // парсим склейку
      let adata = this._data.split(`\n`);

      // последний элемент, который может быть куском числа   
      let last = adata.length - 1;
      // сохраняем хвост до следующей чанки
      [this._data] = adata.slice(last);
      // очистка и удаление мусора
      adata = adata.slice(0, last).filter(numbersOnly);
      // добавляем цельные числа в очередь
      this._queue = this._queue.concat(adata);

      // регулируем пропускную способность 
      this._checkCapacity(MAX_QUE_LEN);
    })
    .on('end', () => {

      // пушим остатки
      if (numbersOnly(this._data)) {
        this._queue.push(data);
        this._data = "";
      }
      // сортируем и сохраняем
      this._checkCapacity(0);
    });
  
  }

  /**
  * регулирование пропускной способности потока
  */
  _checkCapacity(capacity) {
    // если очередь заполнена
    if (this._queue.length >= capacity || 0) {
      // сохраняем и создаем новый писатель
      this._save();

      if (capacity) {
        this._writer = this._createWriter();
      } 
      
    }
  }

  /**
  * Сортировка и запись массива в поток 
  */
   _save() {
    if (this._queue.length > 0) {

      // хотя мы не любим грязные функции
      this._queue.sort((a, b) => Number(a) - Number(b)).forEach((item) => {

        const chunk = Buffer.from(`${item}${DELIM_EOL}`);
        this._writer.write(chunk);
      });
      this._queue = [];
    }

    this._writer.end();
  }

  split(srcFileName) {
    this._srcName = srcFileName;
    this._reader = this._createReader();
  }

}


module.exports = {
  SplitTransform,
};

/**
 * Steps.
 * 1. завернуть алгоритм в класс
 * 2. переименовать класс
 */