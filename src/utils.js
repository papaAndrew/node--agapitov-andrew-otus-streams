const fs = require('fs');
const path = require('path');

function getRandomInt(max) {
  return Math.ceil(Math.random() * max);
}

function deleteFile(fileName) {

  if (fs.existsSync(fileName)) {
    fs.unlinkSync(fileName);
  }
}

const deleteFolderRecursive = function(dirName) {
  if (fs.existsSync(dirName)) {
    fs.readdirSync(dirName).forEach((fileName) => {
      const curPath = `${dirName}/${fileName}`;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirName);
  }
};

function canBeNumeric(str) {
  return str.trim() === `${Number(str)}`;
}


module.exports = {
  getRandomInt,
  deleteFile, 
  deleteFolderRecursive,
  canBeNumeric
};


