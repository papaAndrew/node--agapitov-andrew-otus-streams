const { Readable } = require('stream');
const fs = require('fs');
const utils = require('./src/utils');
const { networkInterfaces } = require('os');


const BUFFER_SIZE = 1024 * 16;
const MIN_QUE_LEN = 512;
const MAX_QUE_LEN = 1024;

const STATE_NONE = 0;
const STATE_READ = 1;
const STATE_END = 2;

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
    
    if (this._queue.length < MIN_QUE_LEN) {

      if (this._stream.isPaused()) {
        this._stream.resume();
      }
    } else if (this._queue.length >= MAX_QUE_LEN) {

      if (!this._stream.readableEnded) {
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
    let res;

    if (this.hasValue()) {
      res = null;

      if (this._queue.length > 0) {
        // шифтим очередь (мы не любим грязные функции)
        res = this._queue[0];
        this._queue = this._queue.slice(1);

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
    
    const DELAY_MS = 100;
    const WAITING_TIMEOUT = 10;

    return new Promise((resolve) => {
      if (this.hasValue()) {
        resolve(this);
      }
      let i = 0;
      while (!this.hasValue()) {
        i+=1;
        if (i > WAITING_TIMEOUT) break;
        this._checkCapacity();
        setTimeout({}, DELAY_MS);
      }
      
      if (this.hasValue()) {
        resolve(this);
      } else {
        new Error(`File ${this._fileName} access denied`);
      }
    });
  }
  
  swapSync () {
    
    const DELAY_MS = 100;
    const WAITING_TIMEOUT = 10;

    if (this.hasValue()) {
      return this;
    }

    let i = 0;
    while (!this.hasValue()) {
      i+=1;
      if (i > WAITING_TIMEOUT) break;
      setTimeout(this._checkCapacity, DELAY_MS);
    }
    
    if (this.hasValue()) {
      return this;
    } else {
      throw new Error(`File ${this._fileName} access denied`);
    }
  }
  
  /**
   * показывает текущее значение в очереди, или null, если поток завершен.
   * вызывать после проверки hasValue()
   * @returns {null | string} 
   */
  display() {
    return this.isEnded() ? null : this._queue[0];
  }
}

class OrderedReader extends Readable {

  constructor(opt) {
    super(opt);

    this._wrappers = [];

    this._open();
  }

  _addWrapper(fileName) {

    const wrapper = new StreamWrapper(fileName);
    this._wrappers.push(wrapper);
    return wrapper;
  }

  /**
   * вычисляет раппер с минимальным значением
   */
  _getMinWrapper() {
    //let wrapper;

    /* try {
      wrapper = this._wrappers[0].swap();
    } catch (err) {
      console.log(err);
    }
     */
    return this._wrappers[0];
    

    
    /*
    return this._handlers.reduce((winner, current) => {
      let result = winner;

      if (current.hasValue()) {
        if (winner === null) {
          result = current;
        } else if (current.value < winner.value) {
          result = current;
        }
      } 
      return result;
    });
    */
  }


  /**
   * реализация метода чтения
   * @param {int} size 
   */
  _read(size) {
    
    this._wrappers[0].swap()
    .then(() => {
      let chunk = null;
      const wrapper = this._getMinWrapper();
      if (wrapper) {
        chunk = wrapper.get();
        if (chunk !== null) {
          chunk = Buffer.from(`${chunk}\n`) ;
        }
      }
  
      this.push(chunk);
    })
    .catch(console.log)
  }

  _open() {
    const fileName = "data/out6";
    this._addWrapper(fileName);
  }
}


const fileName = "data/reader-test";
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
*/
