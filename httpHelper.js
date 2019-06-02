module.exports = function () {

    this.parseJsonFromRequest = function (req) {
        return new Promise(function (res, rej) {
            if (req === undefined || req === null || req.length === 0)
                rej('Request not given.');

            var body = '';
            req.on('data', function (chunk) {
                body += chunk.toString();
            });
            console.log(`1. body: ${body}`);

            req.on('end', () => {
                if (body === undefined || body === null || body.length === 0)
                    rej('Body data null.');
                try {
                    bodyJson = JSON.parse(body);
                    console.log(bodyJson);
                    res(bodyJson);
                } catch (e) {
                    rej(`Body data not parsed to json: ${e}`);
                }
            });
        });
    };

    this.processRequest = function (req, callback) {
        var body = '';
        req.on('data', function (data) { body += data; });
        req.on('end', function () { callback(qs.parse(body)); });
    }

};