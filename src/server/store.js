import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeProject, newProject } from '../core/project.js';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const PROJECTS_DIR = path.join(ROOT, 'projects');

export function ensureDirs() {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

export function projectDir(name) {
  return path.join(PROJECTS_DIR, safeName(name));
}

export function safeName(name) {
  const clean = String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!clean) throw new Error('Invalid project name');
  return clean;
}

export function listProjects() {
  ensureDirs();
  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(PROJECTS_DIR, d.name, 'project.json')))
    .map((d) => {
      const p = loadProject(d.name);
      return { name: d.name, frames: p.frames.length, devices: p.devices, app: p.app };
    });
}

export function projectExists(name) {
  return fs.existsSync(path.join(projectDir(name), 'project.json'));
}

export function loadProject(name) {
  const file = path.join(projectDir(name), 'project.json');
  if (!fs.existsSync(file)) throw new Error(`Project "${name}" not found (${file})`);
  return normalizeProject(JSON.parse(fs.readFileSync(file, 'utf8')));
}

export function saveProject(name, project) {
  const dir = projectDir(name);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'project.json'),
    JSON.stringify(normalizeProject(project), null, 2)
  );
  return path.join(dir, 'project.json');
}

export function createProject(name, opts = {}) {
  const dir = projectDir(name);
  if (projectExists(name)) throw new Error(`Project "${name}" already exists`);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  const p = newProject(safeName(name), opts);
  saveProject(name, p);
  return p;
}

export function saveAsset(name, filename, buffer) {
  const dir = path.join(projectDir(name), 'assets');
  fs.mkdirSync(dir, { recursive: true });
  const base = path
    .basename(filename)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .toLowerCase();
  let target = base;
  let i = 1;
  while (fs.existsSync(path.join(dir, target))) {
    const ext = path.extname(base);
    target = `${path.basename(base, ext)}-${i++}${ext}`;
  }
  fs.writeFileSync(path.join(dir, target), buffer);
  return `assets/${target}`;
}

export function importImage(name, srcPath) {
  const buf = fs.readFileSync(srcPath);
  return saveAsset(name, path.basename(srcPath), buf);
}
