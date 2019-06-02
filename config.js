var fs = require('fs');

function readConfig() {
    var config = JSON.parse(fs.readFileSync('config.json'));
    return config;
}

module.exports = readConfig();