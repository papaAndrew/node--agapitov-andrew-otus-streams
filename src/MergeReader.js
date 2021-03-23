const { Readable } = require('stream');
const fs = require('fs');
const utils = require('./utils');

/**/
const BUFFER_SIZE = 1024 * 8;
const MIN_QUE_LEN = 10;
const MAX_QUE_LEN = 100;

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

    if (this._queue.length <= MIN_QUE_LEN) {

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

const STATE_NONE = 0;
const STATE_READY = 1;
const STATE_BUSY = 2;

class MergeReader extends Readable {

  constructor(dirName, opt) {
    super(opt);

    this._state = STATE_NONE;
    this._count = 0;

    this._paths = fs.readdirSync(dirName).map((fileName) => `${dirName}/${fileName}`);
    this._wrappers = [];

    this._open();
  }

  _open() {
    
    if (this._state !== STATE_NONE) {
      return;
    }

    this._state = STATE_BUSY;

    this._paths.forEach((fileName) => {
      this._addWrapper(`${fileName}`);
    });

    this._state = STATE_READY;
  }

  _addWrapper(fileName) {

    const wrapper = new StreamWrapper(fileName);
    this._wrappers.push(wrapper);
    return wrapper;
  }

  /**
   * сравнивает текущие значения в очередях рапперов, выбирает наименьший их них, вычитывает значение из очереди и готовит его для записи.
   * для этого придется синхронизировать все потоки, чтобы в каждой очереди появился нулевой элемент, либо поток завершился
   * @returns 
   */
  async _get() {

    // синхронизация потоков
    let swaps = this._wrappers.map((wrapper) => wrapper.swap());

    // вычисление раппера с наименьшим значением в нулевой ячейке
    const wrapper = await Promise.all(swaps)
    .then((wrappers) => {
      //console.log("rappers count", wrappers.length);

      return wrappers.reduce((winner, current) => {
        let result = winner;
        
        const oldValue = winner.display();
        //console.log(i, "oldValue", oldValue);  

        if (oldValue) {
          const newValue = current.display();
          //console.log(i, "newValue", newValue);  

          if (newValue && (newValue < oldValue)) {
            //console.log(i, "newValue < oldValue", `${newValue} < ${oldValue}`);  
            result = current;
          } else {
            //console.log(i, "oldValue < newValue", `${oldValue} < ${newValue}`);  
          }
        } else {
          result = current;
          //console.log(i, "result = current");  
        }
        //i+=1;
        //console.log(i, "return", result.display());  
        return result;
      });
    });

    this._count+=1;
    if (this._count % (this._wrappers.length * 10000) === 0) {
      console.log(this._count, "words passed");
      console.log(process.memoryUsage());
    }
    

    // данные для записи
    if (wrapper) {
      return wrapper.get();
    } else {
      return null;
    }
  }

  /**
   * реализация метода чтения
   * @param {int} size 
   */
  async _read(size) {
    // ожидаем пока прибудет очередное значение
    let chunk = await this._get();

    if (chunk !== null) {
      // преобразуем в буфер
      chunk = Buffer.from(`${chunk}${DELIM_EOL}`) ;
    }
    this.push(chunk);
  }
}


module.exports = {
  MergeReader
};

/* How to use:

const fileName = "data/reader-out";
utils.deleteFile(fileName);
const writer = fs.createWriteStream(fileName);

const reader = new MergeReader("data/sorted");
reader.pipe(writer);
*/

/* Steps
1. написать Readeble, который с использованием StreamWrapper копирует содержимое 1 файла 
2. сделать метод wrapper.swap() промисом
3. включить настоящий стрим в раппере
4. сделать метод wrapper.swap() синхронным
5. сделать метод wrapper.swap() промисом
6. для поиска минимального значения применить Promise.all()
7. попробовать на двух файлах
8. на всех файлах
9. вынести StreamWrapper в отдельный файл
*/
