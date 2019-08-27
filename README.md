# Description

This module gives a recapitulative of installed modules for auditing / updating.

Internally it executes :
- package vulnerabilities : "npm audit --json"
- package needing update : "npm outdated --json"
- duplicate content : "npm run jsinspect --reporter json"
- require tree (internal code)
- package size : "https://packagephobia.now.sh/ on each module of your package.json"
- package download count (popularity) : "https://api.npmjs.org/downloads/point/last-month/... on each module of your package.json"

# Run

Go into a node project and type the following :

    $> npm install -g npmrecap
    $> npmrecap

If u want to install it locally :

    $> npm install -D npmrecap
    $> npm run npmrecap

If u dont want to install it you can start it directly with :

    $> npx npmrecap

# Options

    $> node index.js --help
    Options:
    --version    Show version number                                     [boolean]
    --help       Show help                                               [boolean]
    --reporter   choose a format to display result
                                [choices: "json", "text", "html"] [default: "text"]
    --outputdir  select output directory when choosing html reporter
                                                            [default: "npmrecap"]

# Sample output

This command will give something like the following

    $> node index.js
        ┌──────────────┬─────────┬─────────────────┬────────────────────┬───────────┐
        │ package      │ size    │ vulnerabilities │ outdated           │ downloads │
        ├──────────────┼─────────┼─────────────────┼────────────────────┼───────────┤
        │ TOTAL        │ 6.02 MB │ 1               │ 1                  │ 123445    │
        ├──────────────┼─────────┼─────────────────┼────────────────────┼───────────┤
        │ async        │ 694 kB  │ 1               │                    │ 234       │
        ├──────────────┼─────────┼─────────────────┼────────────────────┼───────────┤
        │ cli-table    │ 127 kB  │                 │                    │ 456       │
        ├──────────────┼─────────┼─────────────────┼────────────────────┼───────────┤
        │ pretty-bytes │ 8.66 kB │                 │                    │ 3456789   │
        ├──────────────┼─────────┼─────────────────┼────────────────────┼───────────┤
        │ request      │ 4.68 MB │                 │                    │ 345555    │
        ├──────────────┼─────────┼─────────────────┼────────────────────┼───────────┤
        │ yargs        │ 513 kB  │                 │ 13.3.0>14.0.0      │ 786797    │
        └──────────────┴─────────┴─────────────────┴────────────────────┴───────────┘


Alternatively u can get a json output

    $> node index.js --reporter=json
    {
        "dependencies": {
            "async": {
                "downloads": 123456,
                "size": 694474
            },
            "cli-table": {
                "downloads": 123456,
                "size": 126628
            },
            "pretty-bytes": {
                "downloads": 123456,
                "size": 8656
            },
            "request": {
                "downloads": 123456,
                "size": 4680047
            },
            "yargs": {
                "downloads": 123456,
                "size": 512825
            }
        },
        "size": 6022630,
        "audit": 0
        ...
    }
    

Or an html result with graphs.
