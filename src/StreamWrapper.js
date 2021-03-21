const fs = require('fs');
const utils = require('./utils');

/**/
const BUFFER_SIZE = 1024 * 16;
const MIN_QUE_LEN = 512;
const MAX_QUE_LEN = 1024;
const DELAY_TIMEOUT = 3;

const DELIM_EOL = `\n`;
/**/

class StreamWrapper {

  constructor(fileName) {

    this._fileName = fileName;
    this._data = "";
    this._queue = [];
    this._stream = this._createStream();
  }

  _createStream() {
    // чтобы в очередь добавлялись только валидные значения, без мусора
    const numbersOnly = utils.canBeNumeric;

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
      // сохраняем хвост до следующей чанки
      [this._data] = adata.slice(last);
      // очистка и удаление мусора
      adata = adata.slice(0, last).filter(numbersOnly);
      // добавляем цельные числа в очередь
      this._queue = this._queue.concat(adata);

      // регулируем пропускную способность 
      this._checkCapacity();
    });
  }

  /**
   * регулирование пропускной способности потока
   */
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
        
        res = this._queue[0];
        // шифтим очередь
        this._queue = this._queue.slice(1);
        
        //console.log("que shifted");

        // проверяем размер очереди
        this._checkCapacity();
      } 
    }
    return res;
  }

  /**
   * показывает текущее значение в очереди, или null, если поток завершен.
   * вызывать после проверки hasValue()
   * @returns { null | string} 
   */
   display() {
    if (this._queue.length > 0) {

        return Number(this._queue[0].trim());
    }
    
    if (this._stream.readableEnded) {
      return null;
    } else {
      // поток не завершен, но очередь пуста - это ненормально
      throw new Error("No value is in queue");
    }
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

      function waitForValue() {

        if (owner.hasValue()) {
          resolve(owner);
          return;
        }
       setTimeout(waitForValue, DELAY_TIMEOUT);
      } 
  
      waitForValue();
    });
  }
  
}


module.exports = {
  DELIM_EOL,
  StreamWrapper,
};