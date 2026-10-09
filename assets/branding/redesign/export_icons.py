import os, json, subprocess, sys
import gen_premium as g   # regenerates j-snaps-premium.svg

d = g.d
out = os.path.join(d, "export"); os.makedirs(out, exist_ok=True)
R = os.path.join(os.path.expanduser("~"), ".gemini", "config", "skills", "logo-design", "scripts", "render_png.py")

# Small-size cut: flat, no corners / shadows, bigger J' for 16-48 px
T = "translate(4,10) scale(1.02) translate(26,0) skewX(-12)"
small = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="56" fill="#07101F"/>'
         f'<path d="{g.J_PATH}" transform="{T}" fill="#F7F3E9"/>'
         f'<path d="{g.APOS}" transform="translate(-2,10) scale(1.02)" fill="#E0A817"/></svg>')
sp = os.path.join(out, "icon-small.svg"); open(sp, "w", encoding="utf-8").write(small)
big = os.path.join(d, "j-snaps-premium.svg")
open(os.path.join(out, "icon.svg"), "w", encoding="utf-8").write(open(big, encoding="utf-8").read())

def run(*a): subprocess.run([sys.executable, R, *a], check=True)
for s in (512, 192, 180, 128):
    run(big, "-o", os.path.join(out, f"icon-{s}.png"), "--size", str(s))
for s in (48, 32, 16):
    run(sp, "-o", os.path.join(out, f"icon-{s}.png"), "--size", str(s))
run(sp, "--ico", os.path.join(out, "favicon.ico"), "--ico-sizes", "16", "32", "48")

json.dump({"name": "J'snaps", "short_name": "J'snaps", "theme_color": "#07101F", "background_color": "#07101F",
           "display": "standalone",
           "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                     {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}]},
          open(os.path.join(out, "site.webmanifest"), "w"), indent=2)
open(os.path.join(out, "head-snippet.html"), "w").write(
    '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" href="/icon-small.svg" type="image/svg+xml">\n'
    '<link rel="apple-touch-icon" href="/icon-180.png">\n<link rel="manifest" href="/site.webmanifest">\n')
# review sheet of the small cut
sheet = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 200" width="520" height="200"><rect width="520" height="200" fill="#EEF1F7"/>'
         + "".join(f'<g transform="translate({20+i*130},20) scale({s/256})">{small[small.index("<rect"):-6]}</g>' for i, s in enumerate((128, 48, 32, 16)))
         + '</svg>')
open(os.path.join(out, "small-check.svg"), "w").write(sheet)
run(os.path.join(out, "small-check.svg"), "-o", os.path.join(out, "small-check.png"), "--width", "520", "--height", "200")
print(sorted(os.listdir(out)))
