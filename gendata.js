const fs = require('fs');

//process.stdout.setEncoding('utf8')

const outfile = fs.createWriteStream("data/bigdata.txt");

outfile.on('finish', () => {
  console.log('All writes are now complete.');
})

outfile.write('some data');
outfile.end('done writing data');


