//
// scan output of npm audit
//
// exemple of json returned by npm audit
// =====================================
// {
//     "actions": [
//         {
//         "isMajor": true,
//         "action": "install",
//         "resolves": [
//             {
//             "id": 106,
//             "path": "express>connect>compression>accepts>negotiator",
//             "dev": false,
//             "optional": false,
//             "bundled": false
//             },
//         ],
//         "module": "express",
//         "target": "4.17.1"
//         }
//     ],
//     "advisories": {
//         "106": {
//         "findings": [
//             {
//             "version": "0.5.3",
//             "paths": [
//                 "express>connect>compression>accepts>negotiator",
//                 "express>connect>serve-index>accepts>negotiator"
//             ]
//             }
//         ],
//         "id": 106,
//         "created": "2016-05-04T16:34:12.000Z",
//         "updated": "2018-04-17T12:58:40.142Z",
//         "deleted": null,
//         "title": "Regular Expression Denial of Service",
//         "found_by": {
//             "name": "Adam Baldwin"
//         },
//         "reported_by": {
//             "name": "Adam Baldwin"
//         },
//         "module_name": "negotiator",
//         "cves": [
//             "CVE-2016-10539"
//         ],
//         "vulnerable_versions": "<= 0.6.0",
//         "patched_versions": ">= 0.6.1",
//         "overview": "Affected versions of `negotiator` are vulnerable to regular expression denial of service attacks, which trigger upon parsing a specially crafted `Accept-Language` header value.\n\n",
//         "recommendation": "Update to version 0.6.1 or later.",
//         "references": "",
//         "access": "public",
//         "severity": "high",
//         "cwe": "CWE-400",
//         "metadata": {
//             "module_type": "Network.Library",
//             "exploitability": 6,
//             "affected_components": "Internal::Code::Function::acceptsLanguages()"
//         },
//         "url": "https://npmjs.com/advisories/106"
//         },
//     },
//     "muted": [],
//     "metadata": {
//         "vulnerabilities": {
//         "info": 0,
//         "low": 11,
//         "moderate": 3,
//         "high": 8,
//         "critical": 0
//         },
//         "dependencies": 959,
//         "devDependencies": 0,
//         "optionalDependencies": 3,
//         "totalDependencies": 962
//     },
//     "runId": "50da113d-bac3-4587-8285-14b77a00754c"
// }
//

var execFile = require('child_process').execFile;

module.exports = function (ac) {
    execFile(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['audit', '--json'], function (err, stdout, stderr) {
        // if (err) return ac(err);
        if (stderr) return ac(new Error(stderr));
        if (stdout == '') return ac();
        var json = null;
        try {
            json = JSON.parse(stdout);
        } catch (e) {
            return ac(e);
        }
        ac(null, json);
    });
};
