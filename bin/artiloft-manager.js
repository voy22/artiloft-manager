#!/usr/bin/env node
/*
 * npx artiloft-manager init [dir] [--no-install]
 *
 * Scaffolds a repository of web projects: package.json, src/index.js (entry point),
 * projects/ with the demo projects and .gitignore. Existing files are never overwritten.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, cpSync } from 'fs';
import { join, resolve, basename, relative } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TEMPLATES = join(ROOT, 'templates');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const HELP = `artiloft-manager ${VERSION}

Usage:
  npx artiloft-manager init [dir] [--no-install]

  init          create package.json, src/index.js, projects/ with demo projects
                and .gitignore in [dir] (default: current folder), then npm install
  --no-install  skip npm install
  --version     print the version
  --help        print this help
`;

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [command, dir] = args.filter(a => !a.startsWith('--'));

if (flags.includes('--version')) {
    console.log(VERSION);
} else if (command === 'init') {
    init(resolve(dir || '.'), !flags.includes('--no-install'));
} else {
    console.log(HELP);
    process.exit(command || flags.length && !flags.includes('--help') ? 1 : 0);
}

function init(target, install) {
    mkdirSync(target, { recursive: true });
    const log = (action, path) => console.log(`  ${action.padEnd(8)} ${relative(target, path) || '.'}`);
    console.log(`Artiloft web projects in ${target}\n`);

    /* package.json: ESM, start script, dependency */
    const packageFile = join(target, 'package.json');
    const exists = existsSync(packageFile);
    const pkg = exists ? JSON.parse(readFileSync(packageFile, 'utf8')) : {
        name: basename(target).toLowerCase().replace(/[^a-z0-9._-]+/g, '-'),
        version: '1.0.0',
        private: true,
    };
    if (pkg.type && pkg.type !== 'module') {
        console.error(`package.json has "type": "${pkg.type}", web projects need "type": "module"`);
        process.exit(1);
    }
    pkg.type = 'module';
    pkg.scripts = { start: 'node ./src/index.js', ...pkg.scripts };
    pkg.dependencies = { 'artiloft-manager': `^${VERSION}`, ...pkg.dependencies };
    writeFileSync(packageFile, JSON.stringify(pkg, null, 4) + '\n');
    log(exists ? 'updated' : 'created', packageFile);

    /* entry point */
    copy(join(TEMPLATES, 'src', 'index.js'), join(target, 'src', 'index.js'), log);

    /* demo projects: a project folder is copied as a whole or skipped */
    const projectsDir = join(target, 'projects');
    for (const name of readdirSync(join(TEMPLATES, 'projects'))) {
        copy(join(TEMPLATES, 'projects', name), join(projectsDir, name), log);
    }

    /* .gitignore: npm does not publish files named .gitignore */
    const ignoreFile = join(target, '.gitignore');
    const templateLines = readFileSync(join(TEMPLATES, 'gitignore'), 'utf8').split('\n');
    if (existsSync(ignoreFile)) {
        const current = readFileSync(ignoreFile, 'utf8');
        const missing = templateLines.filter(l => l && !l.startsWith('#') && !current.split('\n').includes(l));
        if (missing.length) {
            writeFileSync(ignoreFile, current.replace(/\n?$/, '\n') + missing.join('\n') + '\n');
            log('updated', ignoreFile);
        } else {
            log('skipped', ignoreFile);
        }
    } else {
        writeFileSync(ignoreFile, templateLines.join('\n'));
        log('created', ignoreFile);
    }

    if (install) {
        console.log('\nnpm install');
        const result = spawnSync('npm', ['install'], { cwd: target, stdio: 'inherit', shell: true });
        if (result.status !== 0) process.exit(result.status || 1);
    }

    const cd = relative(process.cwd(), target);
    console.log(`\nDone. Run the shell:\n\n${cd ? `  cd ${cd}\n` : ''}${install ? '' : '  npm install\n'}  npm start\n`);
}

function copy(from, to, log) {
    if (existsSync(to)) {
        log('skipped', to);
        return;
    }
    cpSync(from, to, { recursive: true });
    log('created', to);
}
