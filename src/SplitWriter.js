const { Writable } = require('stream');
const fs = require('fs');
const utils = require('./utils');


const MAX_QUE_LEN = 200000;
const BUFFER_SIZE = 1024 * 16;

const DELIM_EOL = `\n`;
const BASE_NAME = "sorted";

const numbersOnly = utils.canBeNumeric;


class SplitWriter extends Writable  {

  constructor(dirName, opt) {
    super(opt);

    this._data = "";
    this._queue = [];
    this._count = 0

    this._dirName = dirName;
    this._writer = this._createWriter();
  }

  _prepareDir() {
    utils.deleteFolderRecursive(this._dirName);
    fs.mkdirSync(this._dirName);
  }

  /**
   * создает новый писатель
   * @returns {Writable}
   */
  _createWriter() {
    // создаем новый файл
    const postfix = `${this._count}`.padStart(2, "0");
    const fileName = `${this._dirName}/${BASE_NAME}${postfix}`; 
    if (!this._count) {
      this._prepareDir();
    }
    this._count+=1;

    return fs.createWriteStream(fileName, { highWaterMark: BUFFER_SIZE });
  }

  _write(chunk, encoding, callback) {

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

    callback();
  }

  _final(callback) {
    // пушим остатки
    if (numbersOnly(this._data)) {
      this._queue.push(data);
      this._data = "";
    }
    // сортируем и сохраняем
    this._checkCapacity(0);

    callback();
  }

  /**
  * регулирование пропускной способности потока
  */
   _checkCapacity(capacity) {
    // если очередь заполнена
    if (this._queue.length >= capacity || 0) {
      // сохраняем
      this._save();
      // создаем новый писатель, если для него задан размер очереди
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

}


module.exports = {
  SplitWriter
};
