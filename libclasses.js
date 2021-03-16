const { Readable } = require('stream');
const fs = require('fs');
const utils = require('./src/utils');

/**/
const BUFFER_SIZE = 1024 * 16;
const MIN_QUE_LEN = 512;
const MAX_QUE_LEN = 1024;
const DELAY_HASVALUE = 3;
/* */
/*
const BUFFER_SIZE = 8;
const MIN_QUE_LEN = 4;
const MAX_QUE_LEN = 6;
*/
class StreamWrapper {

  constructor(fileName) {

    this._fileName = fileName;
    this._data = "";
    this._queue = [];
    this._stream = this._createStream();

    //this._setDummy();
  }

  _setDummy() {

    this._queue.push("11234", "987678", "0000");
  }

  _createStream() {
    const stream = fs.createReadStream(this._fileName,  { highWaterMark: BUFFER_SIZE });
    return stream
    .on('data', (chunk) => {
      //console.log("onData called");
      // склеиваем остаток от предыдущей чанки
      this._data = this._data.concat(chunk.toString());
      // парсим склейку
      let adata = this._data.split(`\n`);
      // последний элемент, который может быть куском числа   
      let last = adata.length - 1;
      // сохраняем хвост до следующей чанки (не .splice(), потому что мы не любим грязные функции)
      [this._data] = adata.slice(last);
      // добавляем цельные числа в очередь
      this._queue = this._queue.concat(adata.slice(0, last));

      // регулируем пропускную способность 
      this._checkCapacity();
    });
  }

  _checkCapacity() {
    //console.log(`_checkCapacity, quelen=${this._queue.length}`);

    if (this._queue.length < MIN_QUE_LEN) {

      if (this._stream.isPaused()) {
        this._stream.resume();
        //console.log("stream resumed");
      }
    } else if (this._queue.length >= MAX_QUE_LEN) {

      if (!this._stream.readableEnded && !this._stream.isPaused()) {
        //console.log("stream paused");
        this._stream.pause();
      }
    }
  };
  
  /**
   * Шифтит очередь и возвращает очередное число
   * Если очередь пуста и поток  завершен, возвращает null, иначе undefined.
   * Возобновляет чтение, если очередь уменьшилась
   * @returns {string | null | undefined} очередное значение
   */
  get() {
    //console.log("wrapper.get() called");
    let res;
    
    if (this.hasValue()) {
      res = null;

      if (this._queue.length > 0) {
        // шифтим очередь (мы не любим грязные функции)
        res = this._queue[0];
        this._queue = this._queue.slice(1);
        
        //console.log("que shifted");

        // проверяем размер очереди
        this._checkCapacity();
      } 
    }
    return res;
  }

  isEnded() {
    return this._stream.readableEnded;
  }

  /**
   * показывает, готов ли поток к передаче данных
   * если поток завершен, он готов в любом случае 
   * @returns 
   */
  hasValue() {
    //console.log("hasValue()");
    
    if (this._stream.readableEnded) {
      return true;
    } else {
      return (this._queue.length > 0);
    }
  }

 
  /**
   * ожидает aсинхронно новые данные и возвращает this по готовности.  
   * @returns 
   */
  swap () {
    
    const owner = this; 

    //console.log("swap returns Promise");
    return new Promise((resolve) => {

      function wait() {

        if (owner.hasValue()) {
          resolve(owner);
          return;
        }
       setTimeout(wait, DELAY_HASVALUE);
      } 
  
      wait();
    });
  }
  
 
  /**
   * показывает текущее значение в очереди, или null, если поток завершен.
   * вызывать после проверки hasValue()
   * @returns { null | string} 
   */
  display() {
    if (this._queue.length > 0) {
      return  this._queue[0];
    } else if (this._stream.readableEnded) {
      return  null;
    } else {
      throw new Error("No value is visible");
    }
  }
}

class OrderedReader extends Readable {

  constructor(dirName, opt) {
    super(opt);

    this._paths = fs.readdirSync(dirName).map((fileName) => `${dirName}/${fileName}`);
    this._wrappers = [];

    //this._open();
  }

  _open() {
    
    if (!this._wrappers) 
    this._paths.forEach((fileName) => {
      this._addWrapper(`${fileName}`);
    });
  }

  _addWrapper(fileName) {

    const wrapper = new StreamWrapper(fileName);
    this._wrappers.push(wrapper);
    return wrapper;
  }

  async _get() {

    let swaps = this._wrappers.map((wrapper) => wrapper.swap());

    const wrapper = await Promise.all(swaps)
    .then((wrappers) => 
      wrappers.reduce((winner, current) => {
        let result = winner;
        
        if (!winner) {
          result = current;
        } else {
          const oldValue = winner.display();
          if (oldValue) {
            const newValue = current.display();
            if (newValue && newValue < oldValue) {
              result = current;
            }
          } else {
            result = current;
          }
        }
        return result;
    }));

    return wrapper;
  }
  /**
   * реализация метода чтения
   * @param {int} size 
   */
  async _read(size) {
    //console.log("_read()");
    const wrapper = await this._get();

    let chunk = wrapper.get();
    
    //console.log(`chunk`, chunk);

    if (chunk !== null) {
      chunk = Buffer.from(`${chunk}\n`) ;
    }
    this.push(chunk);
  }
}


const fileName = "data/reader-out";
utils.deleteFile(fileName);
const writer = fs.createWriteStream(fileName);

const reader = new OrderedReader();
reader.pipe(writer);


/* Steps
1. написать Readeble, который с использованием StreamWrapper копирует содержимое 1 файла 
2. сделать метод wrapper.swap() промисом
3. включить настоящий стрим в раппере
4. сделать метод wrapper.swap() синхронным
5. сделать метод wrapper.swap() промисом
6. для поиска минимального значения применить Promise.all()
7. попробовать на двух файлах
8. на всех файлах
*/
