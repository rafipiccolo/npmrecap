// 
// get the latest download count from this website :
// https://api.npmjs.org/downloads/point/last-month/jquery
//
// exemple of json returned :
// ==========================
// {
//   downloads: 11347991,
//   start: "2019-07-25",
//   end: "2019-08-23",
//   package: "jquery"
// }

var fs = require('fs');
var request = require('request');
var async = require('async');

module.exports = function(name, callback) {
    if (name.indexOf('/') != -1)
        downloadsOnPackage(name, callback);
    else
        downloadsOnName(name, callback);
}

function downloadsOnPackage(file, callback) {
    fs.readFile(file, function(err, data) {
        if (err) return callback(err);
        
        data = data.toString('utf8');
        data = JSON.parse(data);

	    var dependencyNames = Object.keys(data.dependencies);
        if (data.devDependencies) dependencyNames = [...dependencyNames, ...Object.keys(data.devDependencie)];
        async.mapLimit(dependencyNames, 5, function(packageName, ac) {
            downloadsOnName(packageName, function(err, data) {
                if (err) {
                    data = {name: packageName, err: err, downloads: 0};
                }
                
                ac(null, data);
            });
        }, function(err, results) {
            if (err) return callback(err);
            
            var res = {};
            res.downloads = results.reduce(function(a, x) {
                return a+parseInt(x.downloads)
            }, 0);
            res.dependencies = {};
            results.forEach((x) => res.dependencies[x.package] = {
                downloads: x.downloads,
                err: x.err,
            });
            callback(null, res);
        });
    })
}

function downloadsOnName(dependency, callback) {
    var url = 'https://api.npmjs.org/downloads/point/last-month/'+dependency;
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
