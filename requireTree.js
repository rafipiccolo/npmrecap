var fs = require('fs');
var precinct = require('precinct');
var cabinet = require('filing-cabinet');
var async = require('async');

function extractImports(file, callback) {
    fs.readFile(file, function (err, str) {
        if (err) return callback(err);

        var deps = precinct(str.toString('utf8'));

        /*
        var deps = [];
        
        var reg = /require\('(.*?)'\)/gi;
        var results;
        while (results = reg.exec(str.toString('utf8')))
        deps.push(results[1]);
        */

        callback(null, deps);
    });
}

function resolve(name, fromfile) {
    return cabinet({
        partial: name,
        directory: '.',
        filename: fromfile,
    });
}

function fileToTree(file, callback) {
    extractImports(file, function (err, files) {
        if (err) return callback(err);

        if (files.length == 0) return callback(null, {});

        var res = {};

        async.map(
            files,
            function (f, ac) {
                var newfile = resolve(f, file);

                // ne scan pas l'arbre des libs standard / installée
                if (newfile.indexOf('node_modules/') != -1 || newfile.substr(-3) != '.js') {
                    res[f] = {};
                    return ac();
                }

                // charge l'arbre des fichiers js
                fileToTree(newfile, function (err, tree) {
                    if (err) return ac(err);

                    res[newfile] = tree;
                    ac();
                });
            },
            function (err) {
                if (err) return callback(err);

                callback(null, res);
            }
        );
    });
}

function requireTree(file, callback) {
    file = require('path').resolve(file);

    fileToTree(file, function (err, tree) {
        if (err) return callback(err);

        var res = {};
        res[file] = tree;

        callback(null, res);
    });
}

function showTree(tree, prefix) {
    prefix = prefix || '';
    var s = '';
    var nb = Object.keys(tree).length;
    var i = 0;
    for (var name in tree) {
        i++;

        if (nb == i && prefix) {
            var index = prefix.length - 4;
            prefix = prefix.substring(0, index) + '└' + prefix.substring(index + 1);
        }

        s += prefix + name + '\n';

        var newprefix = '';

        if (prefix) newprefix = prefix.substr(0, -4) + '│   ';

        if (nb == i && prefix) newprefix = prefix.substr(0, -4) + '    ';

        newprefix += '├── ';

        s += showTree(tree[name], newprefix);
    }
    return s;
}

module.exports = {
    requireTree,
    showTree,
};
