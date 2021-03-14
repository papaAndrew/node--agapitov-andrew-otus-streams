const fs = require('fs');

function getRandomInt(max) {
  return Math.ceil(Math.random() * max);
}

function deleteFile(fileName) {

  if (fs.existsSync(fileName)) {
    fs.unlinkSync(fileName);
  }
}


module.exports = {
  getRandomInt,
  deleteFile, 
};