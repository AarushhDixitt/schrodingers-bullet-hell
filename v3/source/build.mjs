// Build: inline fonts + concatenate JS modules into one artifact page.
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const src = p => path.join(root, 'src', p);
const b64 = f => fs.readFileSync(path.join(root, 'fonts', f)).toString('base64');

let html = fs.readFileSync(src('template.html'), 'utf8');

// Subset fonts to exactly the glyphs the game uses.
import { execFileSync } from 'node:child_process';
{
  const jsAll = fs.readdirSync(src('js')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(src('js'), f), 'utf8')).join('');
  const used = new Set([...(jsAll + html)].filter(ch => ch.codePointAt(0) > 126));
  let base = '';
  for (let c = 0x20; c < 0x7f; c++) base += String.fromCharCode(c);
  base += '–—‘’“”…•′″ψΨφπθωγΔαβλτσμνεκρηζξχΩΣΛΓΘΞΠ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ₀₁₂₃₄₅₆₇₈₉ℏ';
  const text = base + [...used].join('');
  const F = path.join(root, 'fonts');
  const sub = (inp, out) => execFileSync('pyftsubset', [path.join(F, inp), '--text=' + text, '--flavor=woff2', '--output-file=' + path.join(F, out), '--layout-features=kern,liga,lnum,tnum,ccmp,mark,mkmk', '--no-hinting']);
  if (process.env.SUBSET !== '0') {
    sub('STIXTwoText-Regular.input.ttf', 'qtext-regular.woff2');
    sub('STIXTwoText-Italic.input.ttf', 'qtext-italic.woff2');
    sub('STIXTwoText-Bold.input.ttf', 'qtext-bold.woff2');
    sub('STIXTwoText-BoldItalic.input.ttf', 'qtext-bolditalic.woff2');
    sub('martian-mono.input.woff2', 'martian-mono.woff2');
    // the math face is only a fallback: keep just the glyphs the text or mono faces lack
    const missing = execFileSync('python3', ['-c', `
import sys
from fontTools.ttLib import TTFont
a = TTFont(sys.argv[1]).getBestCmap(); b = TTFont(sys.argv[2]).getBestCmap()
print(''.join(ch for ch in sys.argv[3] if ord(ch) not in a or ord(ch) not in b))
`, path.join(F, 'qtext-regular.woff2'), path.join(F, 'martian-mono.woff2'), text]).toString().trim();
    execFileSync('pyftsubset', [path.join(F, 'STIXTwoMath.input.ttf'), '--text=' + missing + '⟩⟨√ℏ', '--flavor=woff2', '--output-file=' + path.join(F, 'qmath.woff2'), '--layout-features=kern,ccmp,mark,mkmk', '--no-hinting']);
  }
  // STIX Two Math ships huge Windows metrics (winAscent 2200 / winDescent 1700) so stacked
  // math never clips. Browsers on Windows use those for line boxes, which made every line
  // with a ⟩ or √ four times taller. Normalise them to the text face and prefer typo metrics.
  execFileSync('python3', ['-c', `
import sys
from fontTools.ttLib import TTFont
for p in sys.argv[1:]:
    f = TTFont(p)
    o, h = f['OS/2'], f['hhea']
    o.usWinAscent, o.usWinDescent = 1047, 441
    o.sTypoAscender, o.sTypoDescender, o.sTypoLineGap = 762, -238, 0
    h.ascent, h.descent, h.lineGap = 762, -238, 0
    o.fsSelection |= (1 << 7)
    f.flavor = 'woff2'
    f.save(p)
`, path.join(F, 'qmath.woff2')]);
}
const fonts = {
  FONT_QTEXT_REGULAR: b64('qtext-regular.woff2'),
  FONT_QTEXT_ITALIC: b64('qtext-italic.woff2'),
  FONT_QTEXT_BOLD: b64('qtext-bold.woff2'),
  FONT_QTEXT_BOLDITALIC: b64('qtext-bolditalic.woff2'),
  FONT_QMATH: b64('qmath.woff2'),
  FONT_QMONO: b64('martian-mono.woff2'),
};
for (const [k, v] of Object.entries(fonts)) html = html.split('{{' + k + '}}').join(v);

const jsDir = src('js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort();
let js = '(function(){\n"use strict";\n';
for (const f of files) {
  const code = fs.readFileSync(path.join(jsDir, f), 'utf8');
  js += `\n// ===== ${f} =====\n` + code + '\n';
}
js += '\n})();\n';
if (js.includes('</script')) throw new Error('JS contains </script');
// minify the shipped page (MIN=0 keeps it readable for debugging)
const srcBytes = js.length;
if (process.env.MIN !== '0') {
  const esbuild = (await import('esbuild')).default;
  js = esbuild.transformSync(js, { minify: true, target: 'es2020', legalComments: 'none' }).code;
  html = html.replace(/<style>([\s\S]*?)<\/style>/, (m, css) => '<style>' + esbuild.transformSync(css, { loader: 'css', minify: true }).code + '</style>');
}
html = html.split('{{SCRIPT}}').join(js);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'schrodinger.html'), html);

// Local harness that mimics the artifact skeleton for testing.
const harness = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`;
fs.mkdirSync(path.join(root, 'test'), { recursive: true });
fs.writeFileSync(path.join(root, 'test', 'harness.html'), harness);
// Also a plain JS file for syntax checks
fs.writeFileSync(path.join(root, 'test', 'bundle.js'), js);
console.log('built', (html.length / 1024).toFixed(1) + 'KB', 'js source', (srcBytes / 1024).toFixed(1) + 'KB', 'shipped', (js.length / 1024).toFixed(1) + 'KB', files.length, 'modules');
