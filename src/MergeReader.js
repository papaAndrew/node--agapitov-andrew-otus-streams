const { Readable } = require('stream');
const fs = require('fs');
const { StreamWrapper, DELIM_EOL } = require('./StreamWrapper');

const STATE_NONE = 0;
const STATE_READY = 1;
const STATE_BUSY = 2;

class MergeReader extends Readable {

  constructor(dirName, opt) {
    super(opt);

    this._state = STATE_NONE;

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

  async _get() {

    //let i = 0;
    let swaps = this._wrappers.map((wrapper) => wrapper.swap());

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
