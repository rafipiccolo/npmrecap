#!/usr/bin/env node

var fs = require('fs');
var async = require('async');
var request = require('request');
var execFile = require('child_process').execFile;
const prettyBytes = require('pretty-bytes');


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
        return packagePhobiaOnPackage('./package.json', ac);
    },
    audit: function(ac) {
        audit(ac);
    },
    outdated: function(ac) {
        outdated(ac);
    },
    reporter: function(packagePhobia, audit, outdated, ac) {
        var data = mergeData(packagePhobia, audit, outdated);

        if (argv.reporter == 'json') return reporterJSON(data, ac);
        if (argv.reporter == 'text') return reporterTEXT(data, ac);
        
        return ac(new Error('unknown reporter, please use json or html'));
    }
}, function(err, data){
    if (err) return console.log(err);

    console.log(data.reporter);
})



// scan phobia website to get every package install size
function packagePhobiaOnPackage(file, callback) {
    fs.readFile(file, function(err, data) {
        if (err) return callback(err);
        
        data = data.toString('utf8');
        data = JSON.parse(data);
        async.mapLimit(Object.keys(data.dependencies), 5, function(packageName, ac) {
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
        method: 'get',
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

function audit(ac) {
    execFile('npm', ['audit', '--json'], function(err, stdout, stderr) {
        // if (err) return ac(err);
        // if (stderr) return ac(new Error(stderr));
	if (stdout == '') return ac()
        var json = null;
        try{
            json = JSON.parse(stdout);
        } catch(e) {
            return ac(e);
        }
        ac(null, json);
    });
}

function outdated(ac) {
    execFile('npm', ['outdated', '--json'], function(err, stdout, stderr) {
        // if (err) return ac(err);
        // if (stderr) return ac(new Error(stderr));
	if (stdout == '') return ac()

        var json = null;
        try{
            json = JSON.parse(stdout);
        } catch(e) {
            return ac(e);
        }
        ac(null, json);
    });
}

function mergeData(packagePhobia, audit, outdated) {
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
        head: ['package', 'size', 'vulnerabilities', 'outdated']
    });

    table.push([
        'TOTAL',
        prettyBytes(data.size) || '',
        data.audit || '',
        data.outdated || ''
    ]);

    for (var packageName in data.dependencies) {
        var dependency = data.dependencies[packageName];
        table.push([
            packageName+'',
            dependency.size ? prettyBytes(dependency.size) : '-',
            dependency.vulnerabilities ? dependency.vulnerabilities.length : '',
            dependency.outdated ? dependency.outdated.current+'>'+ependency.outdated.latest : ''
        ]);
    }
    
    s += table.toString();
    callback(null, s);
}



/*
exemple of json returned by npm audit
=====================================
{
    "actions": [
        {
        "isMajor": true,
        "action": "install",
        "resolves": [
            {
            "id": 106,
            "path": "express>connect>compression>accepts>negotiator",
            "dev": false,
            "optional": false,
            "bundled": false
            },
        ],
        "module": "express",
        "target": "4.17.1"
        }
    ],
    "advisories": {
        "106": {
        "findings": [
            {
            "version": "0.5.3",
            "paths": [
                "express>connect>compression>accepts>negotiator",
                "express>connect>serve-index>accepts>negotiator"
            ]
            }
        ],
        "id": 106,
        "created": "2016-05-04T16:34:12.000Z",
        "updated": "2018-04-17T12:58:40.142Z",
        "deleted": null,
        "title": "Regular Expression Denial of Service",
        "found_by": {
            "name": "Adam Baldwin"
        },
        "reported_by": {
            "name": "Adam Baldwin"
        },
        "module_name": "negotiator",
        "cves": [
            "CVE-2016-10539"
        ],
        "vulnerable_versions": "<= 0.6.0",
        "patched_versions": ">= 0.6.1",
        "overview": "Affected versions of `negotiator` are vulnerable to regular expression denial of service attacks, which trigger upon parsing a specially crafted `Accept-Language` header value.\n\n",
        "recommendation": "Update to version 0.6.1 or later.",
        "references": "",
        "access": "public",
        "severity": "high",
        "cwe": "CWE-400",
        "metadata": {
            "module_type": "Network.Library",
            "exploitability": 6,
            "affected_components": "Internal::Code::Function::acceptsLanguages()"
        },
        "url": "https://npmjs.com/advisories/106"
        },
    },
    "muted": [],
    "metadata": {
        "vulnerabilities": {
        "info": 0,
        "low": 11,
        "moderate": 3,
        "high": 8,
        "critical": 0
        },
        "dependencies": 959,
        "devDependencies": 0,
        "optionalDependencies": 3,
        "totalDependencies": 962
    },
    "runId": "50da113d-bac3-4587-8285-14b77a00754c"
}

exemple of json returned by npm outdated :
=========================================
{
    "express": {
        "current": "3.21.2",
        "wanted": "3.21.2",
        "latest": "4.17.1",
        "location": "node_modules/express"
    }
}

exemple of json returned by package phobia :
============================================
{
  "name": "express",
  "version": "4.16.4",
  "publish": {
    "bytes": 207337,
    "pretty": "202 kB",
    "color": "#97CA00"
  },
  "install": {
    "bytes": 1612366,
    "pretty": "1.54 MB",
    "color": "#007EC6"
  }
}



exemple of output of this program :
===================================
{
    "dependencies": {
        "async": {
            "size": 694474
        },
        "benchmark": {
            "size": 1539121
        },
        "cors": {
            "size": 37071
        },
        "deep-equal": {
            "size": 10582
        },
        "express": {
            "size": 1684362,
            "vulnerabilities": [
                {
                    "overview": "Affected versions of `negotiator` are vulnerable to regular expression denial of service attacks, which trigger upon parsing a specially crafted `Accept-Language` header value.\n\n",
                    "recommendation": "Update to version 0.6.1 or later.",
                    "references": "",
                    "path": "express>connect>compression>accepts>negotiator"
                },
                {
                    "overview": "Affected versions of `negotiator` are vulnerable to regular expression denial of service attacks, which trigger upon parsing a specially crafted `Accept-Language` header value.\n\n",
                    "recommendation": "Update to version 0.6.1 or later.",
                    "references": "",
                    "path": "express>connect>serve-index>accepts>negotiator"
                },
                {
                    "overview": "Affected versions of `fresh` are vulnerable to regular expression denial of service when parsing specially crafted user input.",
                    "recommendation": "Update to version 0.5.2 or later.",
                    "references": "",
                    "path": "express>connect>fresh"
                },
                {
                    "overview": "Affected versions of `fresh` are vulnerable to regular expression denial of service when parsing specially crafted user input.",
                    "recommendation": "Update to version 0.5.2 or later.",
                    "references": "",
                    "path": "express>connect>serve-favicon>fresh"
                },
                {
                    "overview": "Affected versions of `fresh` are vulnerable to regular expression denial of service when parsing specially crafted user input.",
                    "recommendation": "Update to version 0.5.2 or later.",
                    "references": "",
                    "path": "express>connect>serve-static>send>fresh"
                },
                {
                    "overview": "Affected versions of `fresh` are vulnerable to regular expression denial of service when parsing specially crafted user input.",
                    "recommendation": "Update to version 0.5.2 or later.",
                    "references": "",
                    "path": "express>fresh"
                },
                {
                    "overview": "Affected versions of `fresh` are vulnerable to regular expression denial of service when parsing specially crafted user input.",
                    "recommendation": "Update to version 0.5.2 or later.",
                    "references": "",
                    "path": "express>send>fresh"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>body-parser>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>compression>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>connect-timeout>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>express-session>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>finalhandler>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>morgan>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>serve-index>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>connect>serve-static>send>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>debug"
                },
                {
                    "overview": "Affected versions of `debug` are vulnerable to regular expression denial of service when untrusted user input is passed into the `o` formatter. \n\nAs it takes 50,000 characters to block the event loop for 2 seconds, this issue is a low severity issue.",
                    "recommendation": "Version 2.x.x: Update to version 2.6.9 or later.\nVersion 3.x.x: Update to version 3.1.0 or later.\n",
                    "references": "- [Issue #501](https://github.com/visionmedia/debug/issues/501)\n- [PR #504](https://github.com/visionmedia/debug/pull/504)",
                    "path": "express>send>debug"
                },
                {
                    "overview": "Affected versions of `mime` are vulnerable to regular expression denial of service when a mime lookup is performed on untrusted user input.",
                    "recommendation": "Update to version 2.0.3 or later.",
                    "references": "[Issue #167](https://github.com/broofa/node-mime/issues/167)",
                    "path": "express>connect>serve-static>send>mime"
                },
                {
                    "overview": "Affected versions of `mime` are vulnerable to regular expression denial of service when a mime lookup is performed on untrusted user input.",
                    "recommendation": "Update to version 2.0.3 or later.",
                    "references": "[Issue #167](https://github.com/broofa/node-mime/issues/167)",
                    "path": "express>send>mime"
                },
                {
                    "overview": "Versions of `base64-url` before 2.0.0 are vulnerable to out-of-bounds read as it allocates uninitialized Buffers when number is passed in input.",
                    "recommendation": "Update to version 2.0.0 or later.",
                    "references": "- [HackerOne Report](https://hackerone.com/reports/321692)",
                    "path": "express>connect>express-session>uid-safe>base64-url"
                },
                {
                    "overview": "Verisons of `morgan` before 1.9.1 are vulnerable to code injection when user input is allowed into the filter or combined with a prototype pollution attack.",
                    "recommendation": "Update to version 1.9.1 or later.",
                    "references": "- [HackerOne Report](https://hackerone.com/reports/390881)\n- [Node.js security-wg](https://github.com/nodejs/security-wg/blob/master/vuln/npm/473.json)",
                    "path": "express>connect>morgan"
                }
            ],
            "outdated": {
                "current": "3.21.2",
                "wanted": "3.21.2",
                "latest": "4.17.1",
                "location": "node_modules/express"
            }
        },
        "helmet": {
            "size": 230819
        },
        "moment": {
            "size": 2792717
        },
        "nconf": {
            "size": 578668
        },
        "undefined": {
            "size": {}
        },
        "request": {
            "size": 4680047
        },
        "winston": {
            "size": 3520213
        },
        "winston-elasticsearch": {
            "size": 8640738
        },
        "yargs": {
            "size": 512825
        },
        "eslint": {
            "outdated": {
                "current": "6.1.0",
                "wanted": "6.2.0",
                "latest": "6.2.0",
                "location": "node_modules/eslint"
            }
        }
    },
    "size": 24921637,
    "audit": 22,
    "outdated": 2
}
*/
