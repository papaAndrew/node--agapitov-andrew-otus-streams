const fs = require('fs');

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
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