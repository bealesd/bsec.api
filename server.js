var port = 8081;
var fs = require("fs");
var express = require('express');
var app = express();
const uuidv1 = require('uuid/v1');

var allowCrossDomain = function (req, res, next) {
   res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Content-Type');

   next();
}

app.use(allowCrossDomain);
app.use(express.json());

app.get('/', function (req, res) {


   fs.readFile(__dirname + "/" + "services.json", 'utf8', function (err, data) {
      if (err) {
         res.end();
         return;
      }
      var services = JSON.parse(data);
      console.log(services);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify(services));
   });
})

app.post('/', function (req, res) {
   fs.readFile(__dirname + "/" + "services.json", 'utf8', function (err, data) {
      console.log(req.body);
      let services = [];
      if (data !== undefined) {
         services = JSON.parse(data); 
      }
      if (req.body.id === "") {
         service = {
            id: uuidv1(),
            title: req.body.title,
            book: req.body.book,
            who: req.body.who,
            date: req.body.date,
            audioId: req.body.audioId
         };
         services.push(service);
      }
      else {
         services.forEach(service => {
            if (service['id'] === req.body.id) {
               service['title'] = req.body.title;
               service['book'] = req.body.book;
               service['who'] = req.body.who;
               service['date'] = req.body.date;
               service['audioId'] = req.body.audioId;
            }
         });

         console.log(services);
      }

      fs.writeFile(__dirname + "/" + "services.json", JSON.stringify(services), function (err) {
         if (err) {
            console.log(err);
         } else {
            response = {
               message: 'File uploaded successfully',
            };
         }

         console.log(response);
         res.end(JSON.stringify(response));
      });
   });
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