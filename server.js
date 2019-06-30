var port = 8081;
var fs = require("fs");
var express = require('express');
var app = express();
const uuidv1 = require('uuid/v1');
const mongoose = require('mongoose');
const multer = require('multer');
const { Readable } = require('stream');
var url = require('url');
var allowCrossDomain = function (req, res, next) {
   res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Content-Type');

   next();
}
app.use(allowCrossDomain);
app.use(express.json());

var path = require('path');
// const config = require("..config").readConfig();
const config = require(path.resolve(__dirname, "./config.js"))

//database connection setup
var mongoConnect = function () {
   const mongoUri = `mongodb://${config.services.accountName}:${config.services.key}@${config.services.accountName}.documents.azure.com:${config.services.port}/${config.services.databaseName}?ssl=true`;
   const cleanMongoUri = url.parse(mongoUri).format();
   mongoose.connect(cleanMongoUri, { useNewUrlParser: true });

   const Schema = mongoose.Schema;
   const serviceSchema = new Schema(
      {
         id: String,
         title: String,
         book: String,
         who: String,
         audioId: String,
         date: String,

      },
      {
         collection: 'Services'
      }
   );

   const Service = mongoose.model('Service', serviceSchema);
   return Service;
}
const Service = mongoConnect();


//crud for services
app.get('/', function (req, res) {
   const docquery = Service.find({});
   docquery
      .exec()
      .then(services => {
         console.log(services + '\n');
         return res.status(200).json(services);
      })
})

app.post('/', function (req, res) {
   if (req.body.id === "") {
      const newService = {
         id: uuidv1(),
         title: req.body.title,
         book: req.body.book,
         who: req.body.who,
         date: req.body.date,
         audioId: req.body.audioId
      };
      const service = new Service(newService);

      service.save(error => {
         console.log(service);
         console.log('Service created successfully!');
         return res.end(JSON.stringify('Service created successfully!'));
      });
   }
   else {
      Service.findOneAndUpdate({ "id": req.body.id }, {
         'title': req.body.title,
         'book': req.body.book,
         'who': req.body.who,
         'date': req.body.date,
         'audioId': req.body.audioId
      }).then(() => {
         return res.end(JSON.stringify('Service updated successfully!'));
      });
   }
})

app.delete('/', function (req, res) {
   console.log(`delete service id: ${req.query.id}`);
   if (req.query.id !== "") {
      Service.findOneAndRemove({ "id": req.query.id }).then(() => {
         return res.end(JSON.stringify('Service deleted.'));
      });
   }
})

//crud for tracks
app.get('/tracks', function (req, res) {
   const gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'tracks'
   });

   res.set('content-type', 'audio/mp3');
   res.set('accept-ranges', 'bytes');
   const trackId = new mongoose.mongo.ObjectId(req.query.trackID);
   let downloadStream = gridFSBucket.openDownloadStream(trackId);

   downloadStream.on('data', (chunk) => {
      res.write(chunk);
   });

   downloadStream.on('error', function () {
      return res.status(404).send('file not found');
   });

   downloadStream.on('end', () => {
      return res.status(200).send();
   })
})

var downsampleBuffer = function (buffer, rate) {
   var sampleRateRatio = 128000 / rate;
   var newLength = Math.round(buffer.length / sampleRateRatio);
   var result = new Float32Array(newLength);
   var offsetResult = 0;
   var offsetBuffer = 0;
   while (offsetResult < result.length) {
      var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      var accum = 0, count = 0;
      for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
         accum += buffer[i];
         count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
   }
   return result;
}

blobToFile = function (theBlob, fileName) {
   //A Blob() is almost a File() - it's just missing the two properties below which we will add
   theBlob.lastModifiedDate = new Date();
   theBlob.name = fileName;
   return theBlob;
}

reSample = function(audioBuffer, targetSampleRate, onComplete) {
   var channel = audioBuffer.numberOfChannels;
   var samples = audioBuffer.length * targetSampleRate / audioBuffer.sampleRate;

   var offlineContext = new OfflineAudioContext(channel, samples, targetSampleRate);
   var bufferSource = offlineContext.createBufferSource();
   bufferSource.buffer = audioBuffer;

   bufferSource.connect(offlineContext.destination);
   bufferSource.start(0);
   offlineContext.startRendering().then(function(renderedBuffer){
       onComplete(renderedBuffer);
   })
}

app.post('/tracks', (req, res) => {
   const storage = multer.memoryStorage()
   const upload = multer({ storage: storage, limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 } });
   upload.single('track')(req, res, (err) => {
      if (err) {
         return res.status(400).json({ message: "Upload Request Validation Failed" });
      } else if (!req.body.name) {
         return res.status(400).json({ message: "No track name in request body" });
      }
      let trackName = req.body.name;

      // var data = downsampleBuffer(req.file.buffer, 48000)
      // var wstream = fs.createWriteStream("C:\\users\\est\\desktop\\test.mp3");
      // var buffer = new Buffer(data.length * 4);
      // for (var i = 0; i < data.length; i++) {
      //    buffer.writeFloatLE(data[i], i * 4);
      // }
      // wstream.write(buffer);
      // wstream.end();

      // Covert buffer to Readable Stream
      const readableTrackStream = new Readable();
      readableTrackStream.push(req.file.buffer);
      readableTrackStream.push(null);
      var buffer = readableTrackStream.read()
      
      var createBuffer = require('audio-buffer-from')
      var abuf = createBuffer(buffer);

      return res.status(500).json({ message: "Error uploading file" });
      // var wstream = fs.createWriteStream("C:\\users\\est\\desktop\\test.mp3");
      // wstream.write(buffer);
      // wstream.end();
      // const gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      //    bucketName: 'tracks'
      // });

      // let uploadStream = gridFSBucket.openUploadStream(trackName);
      // let id = uploadStream.id;
      // readableTrackStream.pipe(uploadStream);
      // return res.status(500).json({ message: "Error uploading file" });
      // uploadStream.on('error', () => {
      //    return res.status(500).json({ message: "Error uploading file" });
      // });

      // uploadStream.on('finish', () => {
      //    return res.status(201).send(id);
      // });
   });
});

app.delete('/tracks', function (req, res) {
   console.log(`delete track id: ${req.query.tracksid}`);
   if (req.query.id !== "") {
      const gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
         bucketName: 'tracks'
      });

      const trackId = new mongoose.mongo.ObjectId(req.query.tracksid);
      gridFSBucket.delete(trackId).then(() => {
         return res.end(JSON.stringify('Track deleted.'));
      });
   }
   else return res.status(400).send('No id sent');
})

//running the server
var server = app.listen(port, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
})

// app.all('/*', function(req, res, next) {
//    res.header("Access-Control-Allow-Origin", "*");
//    res.header("Access-Control-Allow-Headers", "X-Requested-With");
//    next();
//  });