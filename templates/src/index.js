/*
 * Entry point: import the shell and point it to the folder with web projects.
 * The file may live anywhere, the path is resolved relative to this file.
 */
import { Artiloft } from 'artiloft-manager';

const artiloft = new Artiloft();
await artiloft.init(new URL('../projects', import.meta.url));
