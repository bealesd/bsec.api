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
// const config = require("..config").readConfig();
var path = require('path');
const config = require(path.resolve(__dirname, "./config.js"))

app.delete('/', function (req, res) {
   console.log(`delete was called for id: ${req.query.id}`);
   if (req.query.id !== "") {
      Service.findOneAndRemove({ "id": req.query.id }).then(() => {
         res.end(JSON.stringify('File deleted.'));
      });
   }
})

var mongoConnect = function () {
   const mongoUri = `mongodb://${config.services.accountName}:${config.services.key}@${config.services.accountName}.documents.azure.com:${config.services.port}/${config.services.databaseName}?ssl=true`;
   const cleanMongoUri = url.parse(mongoUri).format();
   mongoose.connect(cleanMongoUri, { useNewUrlParser: true });

   const Schema = mongoose.Schema;
   const objectId = Schema.objectId;
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

app.get('/', function (req, res) {
   const docquery = Service.find({});
   docquery
      .exec()
      .then(services => {
         console.log(services + '\n');
         res.status(200).json(services);
      })
})

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

   downloadStream.on('error', function() {
      res.status(404).send('file not found');
    });

   downloadStream.on('end', () => {
      res.end();
   })
})

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
      // Covert buffer to Readable Stream
      const readableTrackStream = new Readable();
      readableTrackStream.push(req.file.buffer);
      readableTrackStream.push(null);

      const gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
         bucketName: 'tracks'
      });

      let uploadStream = gridFSBucket.openUploadStream(trackName);
      let id = uploadStream.id;
      readableTrackStream.pipe(uploadStream);

      uploadStream.on('error', () => {
         return res.status(500).json({ message: "Error uploading file" });
      });

      uploadStream.on('finish', () => {
         return res.status(201).send(id);
      });
   });
});


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
         res.end(JSON.stringify('Service created successfully!'));
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
         res.end(JSON.stringify('Service updated successfully!'));
      });
   }
})

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