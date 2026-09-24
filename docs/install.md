# Install and setup

[← README](../README.md) · **Install** · [Interface](interface.md) · [Data](data.md) · [Project structure](structure.md)

- [Quick start](#quick-start)
- [What `init` creates](#what-init-creates)
- [Manual setup](#manual-setup)
- [Entry point](#entry-point)
- [Running and debugging](#running-and-debugging)
- [Updating the shell](#updating-the-shell)

## Quick start

Requirements: Node.js 18+ and npm.

```sh
mkdir my-projects && cd my-projects
npx artiloft-manager init
npm start
```

`init` creates a repository of web projects in the current folder, copies two demo projects into
`projects/` and runs `npm install`. `npm start` opens the shell with the demo projects.

```
npx artiloft-manager init [dir] [--no-install]
```

| Argument | Meaning |
|---|---|
| `dir` | target folder, created when missing (default: current folder) |
| `--no-install` | do not run `npm install` |
| `--version`, `--help` | print the version / the help |

`init` never overwrites existing files: an existing `src/index.js` or `projects/<demo>` folder is
skipped, so it is safe to run it in an existing repository or to run it again.

## What `init` creates

```
my-projects/
  package.json            ← "type": "module", "start" script, artiloft-manager dependency
  .gitignore              ← node_modules/, config.json, json/, .env
  src/
    index.js              ← entry point
  projects/
    demo-shop/            ← classes extending Shopify
      config.json.example
      lib/Shop.js
      lib/Products.js
    demo-site/            ← plain classes: progress, errors, popups
      lib/Pages.js
      lib/Errors.js
```

An existing `package.json` keeps its fields: `init` only adds `"type": "module"`, the `start` script
and the dependency when they are missing. A `package.json` with `"type": "commonjs"` is rejected, because
web project classes are ES modules.

`config.json` (tokens, passwords) and `json/` (downloaded data) are ignored by git: every developer keeps
their own. Commit `config.json.example` with the keys and placeholder values instead.

## Manual setup

The same result without `npx`:

```sh
npm init -y
npm pkg set type=module scripts.start="node ./src/index.js"
npm install artiloft-manager
mkdir -p src projects
```

then create the entry point (below) and the first project (see [Project structure](structure.md)).

## Entry point

The entry point is any script that imports the shell and tells it where the web projects are.
It may live anywhere and have any name.

```js
// src/index.js
import { Artiloft } from 'artiloft-manager';

const artiloft = new Artiloft();
await artiloft.init(new URL('../projects', import.meta.url));
```

`init(projectsPath)` accepts:

| Value | Resolved as |
|---|---|
| `URL` or `file:` string | the file path of the URL, independent of the current directory (recommended) |
| absolute path | as is |
| relative path (default `'projects'`) | from the package root: the nearest `package.json` above the current directory |

Several entry points may show different sets of projects:

```js
// src/shops.js
await new Artiloft().init(new URL('../shops', import.meta.url));
```

## Running and debugging

```sh
npm start                 # node ./src/index.js
```

Exit with `F1`, `q` or `Ctrl+C` — see [Interface › Hotkeys](interface.md#hotkeys).

**Auto-restart on changes** with [nodemon](https://nodemon.io): `npm install -D nodemon`, then `nodemon.json`:

```json
{
  "watch": ["src", "projects/*/lib"],
  "ext": "js,json,graphql",
  "exec": "node src/index.js",
  "stdin": false
}
```

Do not watch the whole `projects/`: methods write into `projects/*/json/` and every write would restart the shell.

**VS Code debugger** (`.vscode/launch.json`). The shell needs a real terminal, so use `integratedTerminal`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Artiloft",
            "skipFiles": ["<node_internals>/**"],
            "program": "${workspaceFolder}/src/index.js",
            "console": "integratedTerminal"
        }
    ]
}
```

`console.log` draws over the interface. Show debug output in the details panel or a popup instead
([Interface](interface.md)), or run under the debugger.

## Updating the shell

```sh
npm update artiloft-manager       # within the major version of package.json
npm install artiloft-manager@latest
```

Publishing a new version of the shell (maintainers):

```sh
npm version patch                 # or minor / major
npm publish
git push --follow-tags
```
