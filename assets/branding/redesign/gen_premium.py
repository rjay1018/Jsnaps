import os
d = os.path.dirname(os.path.abspath(__file__))

J_PATH = ("M126 60H168V150C168 194 142 216 108 216C82 216 64 202 62 182"
          "C61 172 67 165 75 165C83 165 86 172 90 178C95 186 103 188 111 184"
          "C123 178 126 166 126 148Z M98 52H168V64H98Z")
APOS = "M190 64A16 16 0 1 1 222 64C222 88 210 106 192 120C195 104 191 84 190 64Z"
# Snip-tool signature: dashed rounded selection frame + plus (bottom-right)
CROP = ("M44 82V70A26 26 0 0 1 70 44H82 M108 44H132 M158 44H170A26 26 0 0 1 196 70V82 "
        "M44 108V132 M196 108V132 M44 158V170A26 26 0 0 0 70 196H82 M108 196H132 M196 160V232 M160 196H232")
FIT = "translate(15.7,17.1) scale(.72) "   # shrink J' to sit inside the frame
JT = FIT + "translate(14,12) scale(.9) translate(26,0) skewX(-12)"   # slanted J
AT = FIT + "translate(14,12) scale(.9)"

DEFS = f'''<defs>
<radialGradient id="bg" cx="28%" cy="12%" r="110%"><stop offset="0" stop-color="#07101F"/><stop offset="1" stop-color="#07101F"/></radialGradient>
<radialGradient id="glow" cx="85%" cy="95%" r="60%"><stop offset="0" stop-color="#415A77" stop-opacity=".22"/><stop offset="1" stop-color="#415A77" stop-opacity="0"/></radialGradient>
<linearGradient id="jf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7F3E9"/><stop offset=".6" stop-color="#F7F3E9"/><stop offset="1" stop-color="#D9D3C3"/></linearGradient>
<linearGradient id="af" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE58A"/><stop offset=".35" stop-color="#E8B923"/><stop offset=".7" stop-color="#C8920F"/><stop offset="1" stop-color="#8F6408"/></linearGradient>
<linearGradient id="cf" gradientUnits="userSpaceOnUse" x1="0" y1="44" x2="0" y2="232"><stop offset="0" stop-color="#C9F2E7"/><stop offset=".45" stop-color="#4EC5CC"/><stop offset="1" stop-color="#2A78B8"/></linearGradient>
<linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7F3E9" stop-opacity="0"/><stop offset=".5" stop-color="#F7F3E9" stop-opacity=".75"/><stop offset="1" stop-color="#F7F3E9" stop-opacity="0"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7F3E9" stop-opacity=".12"/><stop offset="1" stop-color="#F7F3E9" stop-opacity="0"/></linearGradient>
<linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7F3E9" stop-opacity=".4"/><stop offset=".35" stop-color="#F7F3E9" stop-opacity=".05"/><stop offset="1" stop-color="#D4AF37" stop-opacity=".35"/></linearGradient>
<clipPath id="tc"><rect width="256" height="256" rx="56"/></clipPath>
<clipPath id="jc"><path d="{J_PATH}" transform="{JT}"/></clipPath>
</defs>'''

def tile():
    s = '<rect width="256" height="256" rx="56" fill="url(#bg)"/><rect width="256" height="256" rx="56" fill="url(#glow)"/>'
    # layered soft shadow under the J
    for dy, op in ((14, .10), (10, .14), (6, .20)):
        s += f'<path d="{J_PATH}" transform="translate(0,{dy}) {JT}" fill="#000" opacity="{op}"/>'
    s += f'<path d="{J_PATH}" transform="{JT}" fill="url(#jf)"/>'
    # diagonal light sweep clipped to the J
    s += '<g clip-path="url(#jc)"><path d="M100 40L128 40L96 230L68 230Z" fill="url(#sw)" opacity=".55"/></g>'
    # apostrophe (gold) with specular dot
    s += f'<g transform="{AT}"><path d="{APOS}" fill="url(#af)" stroke="#FFF3C4" stroke-opacity=".6" stroke-width=".8"/>'
    s += '<ellipse cx="203" cy="57" rx="5" ry="3.2" fill="#fff" opacity=".6" transform="rotate(-25 203 57)"/></g>'
    # slim tool corners
    s += f'<path d="{CROP}" transform="translate(-8,-8)" fill="none" stroke="url(#cf)" stroke-width="13" stroke-linecap="butt" stroke-linejoin="round"/>'
    s += '<g clip-path="url(#tc)"><path d="M0 0H256V104Q128 140 0 104Z" fill="url(#sheen)"/></g>'
    s += '<rect x="1.5" y="1.5" width="253" height="253" rx="54.5" fill="none" stroke="url(#rim)" stroke-width="3"/>'
    return s

open(os.path.join(d, "j-snaps-premium.svg"), "w", encoding="utf-8").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">{DEFS}{tile()}</svg>')

# presentation sheet: dark + light surfaces and sizes
sh = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 560" width="1400" height="560">{DEFS}'
sh += '<rect width="700" height="560" fill="#07101F"/><rect x="700" width="700" height="560" fill="#EEF1F7"/>'
sh += f'<g transform="translate(190,70) scale(1.25)">{tile()}</g>'
sh += f'<g transform="translate(890,70) scale(1.25)">{tile()}</g>'
for i, sz in enumerate((96, 64, 32, 16)):
    sh += f'<g transform="translate({60 + i*120},430) scale({sz/256})">{tile()}</g>'
    sh += f'<g transform="translate({760 + i*120},430) scale({sz/256})">{tile()}</g>'
sh += '</svg>'
open(os.path.join(d, "premium-sheet.svg"), "w", encoding="utf-8").write(sh)
