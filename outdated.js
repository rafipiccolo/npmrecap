//
// scan output of npm outdated
//
// exemple of json returned by npm outdated :
// =========================================
// {
//     "express": {
//         "current": "3.21.2",
//         "wanted": "3.21.2",
//         "latest": "4.17.1",
//         "location": "node_modules/express"
//     }
// }

var execFile = require('child_process').execFile;

module.exports = function (ac) {
    execFile(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['outdated', '--json'], function (err, stdout, stderr) {
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
