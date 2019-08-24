#!/usr/bin/env node

// 
// exemple of output of this program :
// ===================================
// {
//     "dependencies": {
//         "async": {
//             "downloads": 122761424,
//             "size": 694474
//         },
//         "benchmark": {
//             "downloads": 122761424,
//             "size": 1539121
//         },
//         "cors": {
//             "downloads": 122761424,
//             "size": 37071
//         },
//         "deep-equal": {
//             "downloads": 122761424,
//             "size": 10582
//         },
//         "express": {
//             "downloads": 122761424,
//             "size": 1684362,
//             "vulnerabilities": [
//                 {
//                     "overview": "Affected versions of `negotiator` are vulnerable to regular expression denial of service attacks, which trigger upon parsing a specially crafted `Accept-Language` header value.\n\n",
//                     "recommendation": "Update to version 0.6.1 or later.",
//                     "references": "",
//                     "path": "express>connect>compression>accepts>negotiator"
//                 },
//             ],
//             "outdated": {
//                 "current": "3.21.2",
//                 "wanted": "3.21.2",
//                 "latest": "4.17.1",
//                 "location": "node_modules/express"
//             }
//         },
//         "helmet": {
//             "downloads": 122761424,
//             "size": 230819
//         },
//         "moment": {
//             "downloads": 122761424,
//             "size": 2792717
//         },
//         "nconf": {
//             "downloads": 122761424,
//             "size": 578668
//         },
//         "undefined": {
//             "downloads": 122761424,
//             "size": {}
//         },
//         "request": {
//             "downloads": 122761424,
//             "size": 4680047
//         },
//         "winston": {
//             "downloads": 122761424,
//             "size": 3520213
//         },
//         "winston-elasticsearch": {
//             "downloads": 122761424,
//             "size": 8640738
//         },
//         "yargs": {
//             "downloads": 122761424,
//             "size": 512825
//         },
//         "eslint": {
//             "downloads": 122761424,
//             "outdated": {
//                 "current": "6.1.0",
//                 "wanted": "6.2.0",
//                 "latest": "6.2.0",
//                 "location": "node_modules/eslint"
//             },
//         }
//     },
//     "size": 24921637,
//     "audit": 1,
//     "outdated": 2,
//     "downloads": "-",
// }
// 


var async = require('async');
const humanFormat = require('human-format');
var packagePhobia = require('./packagePhobia.js');
var audit = require('./audit.js');
var outdated = require('./outdated.js');
var downloads = require('./downloads.js');


// parse parameters and launch cli functions
const argv = require('yargs')
    .help('help')
    .option('reporter', {
        describe: 'choose a format to display result',
        choices: ['json', 'text'],
        default: 'text'
    })
    .argv;

async.autoInject({
    packagePhobia: function(ac) {
        packagePhobia('./package.json', ac);
    },
    audit: function(ac) {
        audit(ac);
    },
    outdated: function(ac) {
        outdated(ac);
    },
    downloads: function(ac) {
        downloads('./package.json', ac);
    },
    reporter: function(packagePhobia, audit, outdated, downloads, ac) {
        var data = mergeData(packagePhobia, audit, outdated, downloads);

        if (argv.reporter == 'json') return reporterJSON(data, ac);
        if (argv.reporter == 'text') return reporterTEXT(data, ac);
        
        return ac(new Error('unknown reporter, please use json or html'));
    }
}, function(err, data){
    if (err) return console.log(err);

    console.log(data.reporter);
})


function mergeData(packagePhobia, audit, outdated, downloads) {
    var data = {};

    data.dependencies = {};

    if (packagePhobia) {
        data.size = packagePhobia.size;
        Object.keys(packagePhobia.dependencies).forEach(function(packageName) {
            data.dependencies[packageName] = data.dependencies[packageName] || {};
            data.dependencies[packageName].size = packagePhobia.dependencies[packageName].size;
            data.dependencies[packageName].err = packagePhobia.dependencies[packageName].err;
        })
    }
    
    if (audit) {
        data.audit = audit.metadata.vulnerabilities.info + audit.metadata.vulnerabilities.low + audit.metadata.vulnerabilities.moderate + audit.metadata.vulnerabilities.high + audit.metadata.vulnerabilities.critical;
        Object.keys(audit.advisories).forEach(function(i) {
            var advisory = audit.advisories[i];
            advisory.findings.forEach(function(finding) {
                finding.paths.forEach(function(path) {
                    var rootModule = path.split('>')[0];
                    data.dependencies[rootModule] = data.dependencies[rootModule] || {};
                    data.dependencies[rootModule].vulnerabilities = data.dependencies[rootModule].vulnerabilities || [];
                    data.dependencies[rootModule].vulnerabilities.push({
                        overview: advisory.overview,
                        recommendation: advisory.recommendation,
                        references: advisory.references,
                        path: path,
                    });
                });
            })
        })
    }
    
    if (outdated) {
        data.outdated = Object.keys(outdated).length;
        Object.keys(outdated).forEach(function(packageName) {
            data.dependencies[packageName] = data.dependencies[packageName] || {};
            data.dependencies[packageName].outdated = outdated[packageName];
        })
    }
    
    
    if (downloads) {
        data.downloads = '-';
        Object.keys(downloads.dependencies).forEach(function(packageName) {
            data.dependencies[packageName] = data.dependencies[packageName] || {};
            data.dependencies[packageName].downloads = downloads.dependencies[packageName].downloads;
        })
    }
    
    return data;
}

// render data as JSON or HTML
function reporterJSON(data, callback) {
    callback(null, JSON.stringify(data, null, 4));
}

function reporterTEXT(data, callback) {
    var s = '';
    
    var Table = require('cli-table');
    var table = new Table({
        head: ['package', 'size', 'vulnerabilities', 'outdated', 'downloads']
    });

    table.push([
        'TOTAL',
        humanFormat(data.size, {unit: 'B'}) || '',
        data.audit || '',
        data.outdated || '',
        data.downloads || '',
    ]);

    for (var packageName in data.dependencies) {
        var dependency = data.dependencies[packageName];
        table.push([
            packageName+'',
            dependency.size ? humanFormat(dependency.size, {unit: 'B'}) : '-',
            dependency.vulnerabilities ? dependency.vulnerabilities.length : '',
            dependency.outdated ? dependency.outdated.current+'>'+dependency.outdated.latest : '',
            dependency.downloads ? humanFormat(dependency.downloads) : '-',
        ]);
    }
    
    s += table.toString();
    callback(null, s);
}
