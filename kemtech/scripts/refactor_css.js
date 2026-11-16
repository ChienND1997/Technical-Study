import fs from 'fs';
import path from 'path';

const cssPath = path.resolve('kemtech/apps/web/src/styles/global.css');
const raw = fs.readFileSync(cssPath, 'utf8');

// Parse CSS taking into account comments, strings, and braces
function parseCss(css) {
  let pos = 0;
  const len = css.length;

  function skipWhitespace() {
    while (pos < len && /\s/.test(css[pos])) pos++;
  }

  function readComment() {
    const start = pos;
    pos += 2; // skip /*
    const end = css.indexOf('*/', pos);
    if (end === -1) {
      pos = len;
      return { type: 'comment', value: css.slice(start).trim() };
    }
    pos = end + 2;
    return { type: 'comment', value: css.slice(start, pos).trim() };
  }

  function readString(quote) {
    let s = quote;
    pos++;
    while (pos < len && css[pos] !== quote) {
      if (css[pos] === '\\') {
        s += css[pos++];
      }
      s += css[pos++];
    }
    if (pos < len) s += css[pos++];
    return s;
  }

  const nodes = [];

  while (pos < len) {
    skipWhitespace();
    if (pos >= len) break;

    // Comment
    if (css[pos] === '/' && css[pos + 1] === '*') {
      nodes.push(readComment());
      continue;
    }

    // At-rule or standard rule
    let selector = '';
    while (pos < len && css[pos] !== '{' && css[pos] !== ';') {
      if (css[pos] === '/' && css[pos + 1] === '*') {
        // inline comment
        readComment();
        continue;
      }
      if (css[pos] === '"' || css[pos] === "'") {
        selector += readString(css[pos]);
        continue;
      }
      selector += css[pos++];
    }

    selector = selector.trim();

    if (pos < len && css[pos] === ';') {
      // Standalone at-rule like @import or @charset
      pos++;
      if (selector) nodes.push({ type: 'at-statement', value: selector + ';' });
      continue;
    }

    if (pos < len && css[pos] === '{') {
      pos++; // skip {
      // Check if it's an at-rule with nested rules like @media, @supports, @keyframes
      if (selector.startsWith('@media') || selector.startsWith('@supports')) {
        // Nested block
        let depth = 1;
        let inner = '';
        while (pos < len && depth > 0) {
          if (css[pos] === '/' && css[pos + 1] === '*') {
            const comment = readComment();
            inner += '\n' + comment.value + '\n';
            continue;
          }
          if (css[pos] === '"' || css[pos] === "'") {
            inner += readString(css[pos]);
            continue;
          }
          if (css[pos] === '{') depth++;
          else if (css[pos] === '}') depth--;
          if (depth > 0) inner += css[pos++];
          else pos++; // skip closing }
        }
        nodes.push({ type: 'nested-at-rule', selector, inner: parseCss(inner) });
        continue;
      } else if (selector.startsWith('@keyframes')) {
        let depth = 1;
        let inner = '';
        while (pos < len && depth > 0) {
          if (css[pos] === '{') depth++;
          else if (css[pos] === '}') depth--;
          if (depth > 0) inner += css[pos++];
          else pos++;
        }
        nodes.push({ type: 'raw-block', selector, inner });
        continue;
      }

      // Standard rule body: read until matching }
      let body = '';
      let depth = 1;
      while (pos < len && depth > 0) {
        if (css[pos] === '/' && css[pos + 1] === '*') {
          const c = readComment();
          body += ' ' + c.value + ' ';
          continue;
        }
        if (css[pos] === '"' || css[pos] === "'") {
          body += readString(css[pos]);
          continue;
        }
        if (css[pos] === '{') depth++;
        else if (css[pos] === '}') depth--;
        if (depth > 0) body += css[pos++];
        else pos++;
      }

      // Parse declarations
      const decls = body
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean);

      nodes.push({ type: 'rule', selector, declarations: decls });
    }
  }

  return nodes;
}

function stringifyNodes(nodes, indent = '') {
  const lines = [];

  for (const n of nodes) {
    if (n.type === 'comment') {
      lines.push(`${indent}${n.value}`);
    } else if (n.type === 'at-statement') {
      lines.push(`${indent}${n.value}`);
    } else if (n.type === 'nested-at-rule') {
      lines.push(`${indent}${n.selector} {`);
      lines.push(stringifyNodes(n.inner, indent + '  '));
      lines.push(`${indent}}`);
    } else if (n.type === 'raw-block') {
      lines.push(`${indent}${n.selector} {`);
      const rawLines = n.inner.trim().split(/\r?\n/).map(l => (indent + '  ' + l.trim()));
      lines.push(rawLines.join('\n'));
      lines.push(`${indent}}`);
    } else if (n.type === 'rule') {
      const declStr = n.declarations.map((d) => (d.endsWith(';') ? d : d + ';')).join(' ');
      // If 1-3 declarations and not excessively long, put on 1 line
      if (n.declarations.length <= 3 && `${n.selector} { ${declStr} }`.length <= 110) {
        lines.push(`${indent}${n.selector} { ${declStr} }`);
      } else {
        lines.push(`${indent}${n.selector} {`);
        for (const d of n.declarations) {
          const cleanD = d.endsWith(';') ? d : d + ';';
          lines.push(`${indent}  ${cleanD}`);
        }
        lines.push(`${indent}}`);
      }
    }
  }

  return lines.join('\n');
}

const ast = parseCss(raw);
console.log('Total top-level nodes:', ast.length);
const formatted = stringifyNodes(ast);
console.log('Original lines:', raw.split('\n').length);
console.log('Formatted lines:', formatted.split('\n').length);
fs.writeFileSync('kemtech/scripts/formatted_test.css', formatted, 'utf8');
console.log('Saved formatted_test.css');
