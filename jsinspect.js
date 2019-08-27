
// [
//     {
//         "id": "2550ba437078eb6a5b2d25d3916a9d0d273dbf90",
//         "instances": [
//             {
//                 "path": "../audit.js",
//                 "lines": [
//                     87,
//                     98
//                 ],
//                 "code": "   execFile(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['audit', '--json'], function(err, stdout, stderr) {\n       // if (err) return ac(err);\n       if (stderr) return ac(new Error(stderr));\nif (stdout == '') return ac()\n       var json = null;\n       try{\n           json = JSON.parse(stdout);\n       } catch(e) {\n           return ac(e);\n       }\n       ac(null, json);\n   });"
//             },
//             {
//                 "path": "../outdated.js",
//                 "lines": [
//                     18,
//                     30
//                 ],
//                 "code": "execFile(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['outdated', '--json'], function(err, stdout, stderr) {\n    // if (err) return ac(err);\n    if (stderr) return ac(new Error(stderr));\n    if (stdout == '') return ac()\n\n    var json = null;\n    try{\n        json = JSON.parse(stdout);\n    } catch(e) {\n        return ac(e);\n    }\n    ac(null, json);\n});"
//             }
//         ]
//     },
// ]


var execFile = require('child_process').execFile;

module.exports = function(dir, ac) {
    execFile(/^win/.test(process.platform) ? 'npx.cmd' : 'npx', ['-q', 'jsinspect', '--reporter', 'json', '--ignore', 'web/', dir], function(err, stdout, stderr) {
        // if (err) return ac(err);
        if (stderr) return ac(new Error(stderr));
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
