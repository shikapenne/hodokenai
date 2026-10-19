#!/usr/bin/env python3
"""Build the app's web bundle (www/) from tools/src.

  python3 tools/build_web.py           -> www/index.html, www/three.min.js, www/fonts/*
  python3 tools/build_web.py --artifact out.html   -> single-file web version (CDN three.js, Google Fonts)

Fonts are cut down to exactly the characters the game shows, so the app ships
a few hundred KB of fonts instead of ~22 MB.
"""
import json, os, re, shutil, subprocess, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'src')
WWW = os.path.join(ROOT, 'www')
NM = os.path.join(ROOT, 'node_modules')

def read(p): return open(os.path.join(SRC, p), encoding='utf-8').read()

def levels_js():
    items = []
    for L in json.load(open(os.path.join(SRC, 'levels.json'), encoding='utf-8')):
        pos = open(os.path.join(SRC, 'levels', L['id'] + '.b64')).read().strip()
        items.append('  { id: %s, name: %s, desc: %s, chains: %s, pos: "%s" }' % (
            json.dumps(L['id']), json.dumps(L['name'], ensure_ascii=False), json.dumps(L['desc'], ensure_ascii=False),
            json.dumps(L['chains']), pos))
    return 'const LEVELS = [\n' + ',\n'.join(items) + '\n];'

def page_body():
    t = read('template3d.html')
    game = read('game3d.js').replace('/*LEVELS*/', levels_js())
    return t.replace('/*SIM*/', read('sim.js')).replace('/*GAME*/', game)

APP_CSS = """
/* app shell: no zoom, no long-press menus, clear the notch and home bar */
html, body { touch-action: none; -webkit-touch-callout: none; overscroll-behavior: none; }
.hud { padding-top: calc(10px + env(safe-area-inset-top, 0px)); }
.toast { top: calc(70px + env(safe-area-inset-top, 0px)); }
.overlay { padding-top: calc(20px + env(safe-area-inset-top, 0px)); padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px)); }
"""

APP_RULES = """      <div class="rules">
        <div><b>つまむ</b>　鎖に触れて、そのまま引く。つまんだ所はふわっと持ち上がり、ほかの鎖の上を越えられます。</div>
        <div><b>押さえる</b>　鎖を二本の指で。片方で押さえて、もう片方で引く。</div>
        <div><b>視点</b>　何もない所をなぞると移動。二本指でピンチすると拡大縮小、ひねると回転、そろえて上下になぞると傾き。</div>
        <div><b>ゴール</b>　ほかの鎖とも自分自身とも交差しなくなったネックレスは、光って消えます。全部消せばクリア。広いベルベットに並べて広げるのがコツ。</div>
      </div>
"""

def subset_fonts(text):
    """Write www/fonts/*.woff2 + fonts.css containing only the glyphs in `text`."""
    from fontTools import subset
    from fontTools.ttLib import TTFont
    out = os.path.join(WWW, 'fonts'); os.makedirs(out, exist_ok=True)
    css = []
    chars = sorted(set(text) | set(' 0123456789:.　'))
    cps = {ord(c) for c in chars}
    for fam, pkg, weights in [('Shippori Mincho B1', 'shippori-mincho-b1', [600, 800]),
                              ('Zen Kaku Gothic New', 'zen-kaku-gothic-new', [400, 500, 700])]:
        for w in weights:
            files = sorted(glob.glob(os.path.join(NM, '@fontsource', pkg, 'files', f'{pkg}-*-{w}-normal.woff2')))
            for f in files:
                font = TTFont(f)
                have = set(font.getBestCmap().keys()) & cps
                if not have: continue
                opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']
                sub = subset.Subsetter(opts); sub.populate(unicodes=have); sub.subset(font)
                name = os.path.basename(f)
                font.flavor = 'woff2'; font.save(os.path.join(out, name))
                rng = ','.join('U+%X' % c for c in sorted(have))
                css.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/{name}) format('woff2');unicode-range:{rng};}}")
    open(os.path.join(WWW, 'fonts.css'), 'w', encoding='utf-8').write('\n'.join(css))

def build_app():
    body = page_body()
    body = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', body)
    body = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n?', '', body)
    body = body.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="three.min.js"></script>')
    body = body.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    body = re.sub(r'      <div class="rules">.*?      </div>\n', lambda m: APP_RULES, body, count=1, flags=re.S)
    body = body.replace('</style>', APP_CSS + '</style>', 1)
    title = re.search(r'<title>.*?</title>', body).group(0)
    body = body.replace(title + '\n', '', 1)
    html = ('<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
            '<meta name="theme-color" content="#120e22">\n' + title + '\n<link rel="stylesheet" href="fonts.css">\n</head>\n<body>\n'
            + body + '\n</body>\n</html>\n')
    if os.path.isdir(WWW): shutil.rmtree(WWW)
    os.makedirs(WWW)
    open(os.path.join(WWW, 'index.html'), 'w', encoding='utf-8').write(html)
    shutil.copy(os.path.join(NM, 'three', 'build', 'three.min.js'), WWW)
    visible = re.sub(r'<script>.*?</script>', '', html, flags=re.S)
    visible += ''.join(re.findall(r"['`\"]([^'`\"]*[　-鿿][^'`\"]*)['`\"]", html))
    subset_fonts(visible)
    print('www/ built:', sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(WWW) for f in fs) // 1024, 'KB')

def build_artifact(out):
    open(out, 'w', encoding='utf-8').write(page_body())
    print('artifact page written:', out)

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--artifact': build_artifact(sys.argv[2])
    else: build_app()
