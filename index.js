#!/usr/bin/env node

var fs = require('fs');
var downloads = require('./downloads');
var async = require('async');
const humanFormat = require('human-format');
var packagePhobia = require('./packagePhobia.js');
var audit = require('./audit.js');
var outdated = require('./outdated.js');
var requireTree = require('./requireTree.js');
var jsinspect = require('./jsinspect.js');

// parse parameters and launch cli functions
const argv = require('yargs')
    .help('help')
    .option('reporter', {
        describe: 'choose a format to display result',
        choices: ['json', 'text', 'html'],
        default: 'text',
    })
    .option('outputdir', {
        describe: 'select output directory when choosing html reporter',
        default: 'npmrecap',
    }).argv;

async.autoInject(
    {
        packagePhobia: function (ac) {
            packagePhobia('./package.json', ac);
        },
        audit: function (ac) {
            audit(ac);
        },
        outdated: function (ac) {
            outdated(ac);
        },
        downloads: function (ac) {
            downloads('./package.json', ac);
        },
        jsinspect: function (ac) {
            jsinspect('.', ac);
        },
        requireTree: function (ac) {
            var p = JSON.parse(fs.readFileSync('./package.json'));
            if (!p.main) return ac();

            requireTree.requireTree('./' + p.main, ac);
        },
        reporter: function (packagePhobia, audit, outdated, downloads, requireTree, jsinspect, ac) {
            var data = mergeData(packagePhobia, audit, outdated, downloads, requireTree, jsinspect);

            if (argv.reporter == 'json') return reporterJSON(data, ac);
            if (argv.reporter == 'text') return reporterTEXT(data, ac);
            if (argv.reporter == 'html') return reporterHTML(data, argv.outputdir, ac);

            return ac(new Error('unknown reporter, please use json or html'));
        },
    },
    function (err, data) {
        if (err) return console.log(err);

        if (data.reporter) console.log(data.reporter);
    }
);

function mergeData(packagePhobia, audit, outdated, downloads, requireTree, jsinspect) {
    var data = {};

    data.dependencies = {};

    if (packagePhobia) {
        data.size = packagePhobia.size;
        Object.keys(packagePhobia.dependencies).forEach(function (packageName) {
            data.dependencies[packageName] = data.dependencies[packageName] || {};
            data.dependencies[packageName].size = packagePhobia.dependencies[packageName].size;
            data.dependencies[packageName].err = packagePhobia.dependencies[packageName].err;
        });
    }

    if (audit) {
        data.audit =
            audit.metadata.vulnerabilities.info +
            audit.metadata.vulnerabilities.low +
            audit.metadata.vulnerabilities.moderate +
            audit.metadata.vulnerabilities.high +
            audit.metadata.vulnerabilities.critical;
        Object.keys(audit.advisories).forEach(function (i) {
            var advisory = audit.advisories[i];
            advisory.findings.forEach(function (finding) {
                finding.paths.forEach(function (path) {
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
            });
        });
    }

    if (outdated) {
        data.outdated = Object.keys(outdated).length;
        Object.keys(outdated).forEach(function (packageName) {
            data.dependencies[packageName] = data.dependencies[packageName] || {};
            data.dependencies[packageName].outdated = outdated[packageName];
        });
    }

    if (downloads) {
        data.downloads = '-';
        Object.keys(downloads.dependencies).forEach(function (packageName) {
            data.dependencies[packageName] = data.dependencies[packageName] || {};
            data.dependencies[packageName].downloads = downloads.dependencies[packageName].downloads;
        });
    }

    if (requireTree) data.requireTree = requireTree;

    data.jsinspectChord = [];
    if (jsinspect) {
        data.jsinspect = jsinspect;
        var tmp = [];
        jsinspect.forEach(function (line) {
            var filtered = tmp.filter((j) => j.from == line.instances[0].path && j.to == line.instances[1].path);

            if (filtered.length) filtered[0].value++;
            else
                tmp.push({
                    from: line.instances[0].path,
                    to: line.instances[1].path,
                    value: 1,
                });
        });

        data.jsinspectChord = tmp;
    }

    var dependencyTreemap = [];
    for (var i in data.dependencies)
        dependencyTreemap.push({
            name: i,
            children: [
                {
                    name: i,
                    value: data.dependencies[i].size,
                },
            ],
        });
    data.dependencyTreemap = dependencyTreemap;

    function flatten(tree, flat) {
        for (var i in tree) {
            for (var j in tree[i]) {
                flat.push({ from: i, to: j, value: 1 });
            }

            flatten(tree[i], flat);
        }
    }
    var flat = [];
    flatten(data.requireTree, flat);
    data.dependencyChord = flat;
    data.dependencyChordWithoutLibs = flat.filter((x) => x.to.endsWith('.js'));

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
        head: ['package', 'size', 'vulnerabilities', 'outdated', 'downloads'],
    });

    table.push(['TOTAL', data.size ? humanFormat(data.size, { unit: 'B' }) : '', data.audit || '', data.outdated || '', data.downloads || '']);

    for (var packageName in data.dependencies) {
        var dependency = data.dependencies[packageName];
        table.push([
            packageName + '',
            dependency.size ? humanFormat(dependency.size, { unit: 'B' }) : '-',
            dependency.vulnerabilities ? dependency.vulnerabilities.length : '',
            dependency.outdated ? dependency.outdated.current + '>' + dependency.outdated.latest : '',
            dependency.downloads ? humanFormat(dependency.downloads) : '-',
        ]);
    }

    s += table.toString();

    s += '\n';
    s += 'RequireTree:\n';
    s += requireTree.showTree(data.requireTree);

    s += '\n';
    s += 'jsinspect (' + data.jsinspectChord.length + ' duplications):\n';
    s += data.jsinspectChord.map((x) => x.from + ' & ' + x.to + ' : ' + x.value).join('\n');

    callback(null, s);
}

function reporterHTML(data, outputdir, callback) {
    fs.mkdir(outputdir, { recursive: true }, function (err) {
        if (err) return callback(err);

        fs.writeFile(outputdir + '/data.json', JSON.stringify(data, null, 4), function (err) {
            if (err) return callback(err);

            fs.copyFile(__dirname + '/index.html', outputdir + '/index.html', function (err) {
                if (err) return callback(err);

                callback();
            });
        });
    });
}
