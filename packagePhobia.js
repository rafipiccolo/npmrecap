//
// scan package phobia website to get every package install size
//
// exemple of json returned by package phobia :
// ============================================
// {
//   "name": "express",
//   "version": "4.16.4",
//   "publish": {
//     "bytes": 207337,
//     "pretty": "202 kB",
//     "color": "#97CA00"
//   },
//   "install": {
//     "bytes": 1612366,
//     "pretty": "1.54 MB",
//     "color": "#007EC6"
//   }
// }
//

var fs = require('fs');
var request = require('request');
var async = require('async');

module.exports = function(name, callback) {
    if (name.indexOf('/') != -1)
        packagePhobiaOnPackage(name, callback);
    else
        packagePhobiaOnName(name, callback);
}

function packagePhobiaOnPackage(file, callback) {
    fs.readFile(file, function(err, data) {
        if (err) return callback(err);
        
        data = data.toString('utf8');
        data = JSON.parse(data);

        var dependencyNames = Object.keys(data.dependencies);
        if (data.devDependencies) dependencyNames = [...dependencyNames, ...Object.keys(data.devDependencie)];
        async.mapLimit(dependencyNames, 5, function(packageName, ac) {
            packagePhobiaOnName(packageName, function(err, data) {
                if (err) {
                    data = {name: packageName, err: err, install: {bytes: 0}};
                }
                
                ac(null, data);
            });
        }, function(err, results) {
            if (err) return callback(err);
            
            var res = {};
            res.size = results.reduce(function(a, x) {
                return a+parseInt(x.install.bytes)
            }, 0);
            res.dependencies = {};
            results.forEach((x) => res.dependencies[x.name] = {
                size: x.install.bytes,
                err: x.err,
            });
            callback(null, res);
        });
    })
}

function packagePhobiaOnName(dependency, callback) {
    var url = 'https://packagephobia.now.sh/v2/api.json?p='+dependency;
    request({
        method: 'GET',
        url: url,
        json: true,
    }, function(err, response, body) {
        if (err) return callback(err);
        if (parseInt(response.statusCode / 100) != 2) {
            var error = new Error(url+' replied with code '+response.statusCode);
            return callback(error);
        }
        callback(null, body);
    });
}
