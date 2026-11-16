// Fails when a code comment contains Vietnamese diacritics (rule: code comments are English).
// UI strings and error messages are not comments, so they stay Vietnamese.
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['apps/api/src', 'apps/web/src', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', 'dist']);
const EXT = new Set(['.js', '.jsx', '.mjs', '.css']);
const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const files = [];
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (EXT.has(path.extname(e.name))) files.push(p);
  }
})('.');

let bad = 0;
for (const f of files.filter((f) => ROOTS.some((r) => f.split(path.sep).join('/').startsWith(r)))) {
  let inBlock = false;
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    let comment = '';
    if (inBlock) comment = line;
    else {
      const m = line.match(/(?:^|\s)\/\/(.*)$/) || line.match(/\/\*(.*)$/);
      if (m && !/['"`][^'"`]*\/\//.test(line.slice(0, m.index))) comment = m[1];
    }
    if (/\/\*/.test(line) && !/\*\//.test(line)) inBlock = true;
    if (/\*\//.test(line)) inBlock = false;
    // Quoted text is a literal heading/label from the docs, so it may stay Vietnamese.
    comment = comment.replace(/"[^"]*"|`[^`]*`|\*\*[^*]*\*\*/g, '');
    if (comment && VI.test(comment)) { console.log(`${f}:${i + 1}: ${comment.trim()}`); bad++; }
  });
}
console.log(bad ? `\n${bad} non-English comment(s)` : 'ok: all comments are English');
process.exit(bad ? 1 : 0);
