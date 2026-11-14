"""Run: python scripts/make_logo.py .  (needs Pillow)

ToolMeUp multi-tool fan (variation B, full spectrum): one geometry for every output.

Writes: base.html inline marks, static/images/logo-mark.svg (+ -dark), favicon.svg
(light/dark via prefers-color-scheme), favicon-16/32.png, favicon.ico,
apple-touch-icon.png, web-app-icon-192/512.png.
"""
import math, sys, re
from PIL import Image, ImageDraw

root = sys.argv[1]
PIV = (12, 52)          # pivot in the 64x64 viewBox
LEN, W = 46, 6.5        # blade length and width
ANGLES = [-82, -67, -52, -37, -22, -7]
LIGHT = ['#d97706', '#e11d48', '#7c3aed', '#4f46e5', '#2563eb', '#0f766e']   # amber rose violet indigo blue teal
DARK = ['#fbbf24', '#fb7185', '#a78bfa', '#818cf8', '#60a5fa', '#2dd4bf']
PIV_LIGHT = ('#ffffff', '#334155')
PIV_DARK = ('#e2e8f0', '#475569')

def blades_svg(colors, cls=False):
    out = []
    for i, (a, c) in enumerate(zip(ANGLES, colors)):
        attrs = f' class="fan-blade b{i+1}" style="--i:{i};--a:{a}deg"' if cls else ''
        out.append(f'<g{attrs} transform="rotate({a} {PIV[0]} {PIV[1]})"><rect x="{PIV[0]}" y="{PIV[1]-W/2}" width="{LEN}" height="{W}" rx="{W/2}" fill="{c}"/></g>')
    return ''.join(out)

def pivot_svg(fill, stroke, cls=False):
    c = ' class="fan-pivot"' if cls else ''
    return f'<circle{c} cx="{PIV[0]}" cy="{PIV[1]}" r="6.5" fill="{fill}" stroke="{stroke}" stroke-width="3"/>'

# ---- standalone SVG files ----
def file_svg(colors, piv, title='ToolMeUp'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="{title}">\n'
            f'  <!-- ToolMeUp multi-tool fan: six blades, one per tool category. Generated; edit the generator, not this file. -->\n'
            f'  {blades_svg(colors)}\n  {pivot_svg(*piv)}\n</svg>\n')
open(f'{root}/static/images/logo-mark.svg', 'w', encoding='utf-8', newline='\n').write(file_svg(LIGHT, PIV_LIGHT))
open(f'{root}/static/images/logo-mark-dark.svg', 'w', encoding='utf-8', newline='\n').write(file_svg(DARK, PIV_DARK))

fav = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
       '  <!-- Browser-tab icon: light colours by default, lighter ones on dark tab bars. -->',
       '  <style>',
       '    @media (prefers-color-scheme: dark) {']
for i, c in enumerate(DARK):
    fav.append(f'      .b{i+1} {{ fill: {c}; }}')
fav += [f'      .p {{ fill: {PIV_DARK[0]}; stroke: {PIV_DARK[1]}; }}', '    }', '  </style>']
for i, (a, c) in enumerate(zip(ANGLES, LIGHT)):
    fav.append(f'  <rect class="b{i+1}" transform="rotate({a} {PIV[0]} {PIV[1]})" x="{PIV[0]}" y="{PIV[1]-W/2}" width="{LEN}" height="{W}" rx="{W/2}" fill="{c}"/>')
fav.append(f'  <circle class="p" cx="{PIV[0]}" cy="{PIV[1]}" r="6.5" fill="{PIV_LIGHT[0]}" stroke="{PIV_LIGHT[1]}" stroke-width="3"/>')
fav.append('</svg>')
open(f'{root}/favicon.svg', 'w', encoding='utf-8', newline='\n').write('\n'.join(fav) + '\n')

# ---- inline header marks in base.html (CSS recolours for dark mode and animates) ----
inline = (f'<svg class="brand-logo brand-fan" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true" focusable="false">'
          f'{blades_svg(LIGHT, cls=True)}{pivot_svg(*PIV_LIGHT, cls=True)}</svg>')
p = f'{root}/base.html'
s = open(p, encoding='utf-8', newline='').read()
old = re.findall(r'<img class="brand-logo"[^>]*>|<svg class="brand-logo brand-fan".*?</svg>', s)
assert len(old) == 2, old
for o in old:
    s = s.replace(o, inline)
open(p, 'w', encoding='utf-8', newline='').write(s)

# ---- PNG icons (4x supersampled, then downscaled) ----
def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def render(size, bg=None, pad=0.0, radius=0.0):
    ss = 4
    S = size * ss
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius), fill=hexrgb(bg))
    # fan bounding box in viewBox units is roughly x 3.5..60, y 3..60 -> fit into padded square
    inner = S * (1 - 2 * pad)
    k = inner / 64.0
    off = S * pad
    tx = lambda x: off + x * k
    for a, c in zip(ANGLES, LIGHT):
        r = math.radians(a)
        ux, uy = math.cos(r), math.sin(r)
        x0, y0 = PIV[0] + ux * (W / 2), PIV[1] + uy * (W / 2)
        x1, y1 = PIV[0] + ux * (LEN - W / 2), PIV[1] + uy * (LEN - W / 2)
        col = hexrgb(c)
        d.line([tx(x0), tx(y0), tx(x1), tx(y1)], fill=col, width=max(1, round(W * k)))
        for (x, y) in ((x0, y0), (x1, y1)):
            rr = W / 2 * k
            d.ellipse([tx(x) - rr, tx(y) - rr, tx(x) + rr, tx(y) + rr], fill=col)
    cx, cy = tx(PIV[0]), tx(PIV[1])
    ro, ri = 8 * k, 5 * k
    d.ellipse([cx - ro, cy - ro, cx + ro, cy + ro], fill=hexrgb(PIV_LIGHT[1]))
    d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=hexrgb(PIV_LIGHT[0]))
    return img.resize((size, size), Image.LANCZOS)

render(16).save(f'{root}/favicon-16.png')
render(32).save(f'{root}/favicon-32.png')
render(48).save(f'{root}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
render(180, bg='#ffffff', pad=0.12).save(f'{root}/apple-touch-icon.png')        # iOS masks the corners itself
render(192, bg='#ffffff', pad=0.12, radius=0.22).save(f'{root}/web-app-icon-192.png')
render(512, bg='#ffffff', pad=0.12, radius=0.22).save(f'{root}/web-app-icon-512.png')
print('ok')
