from PIL import Image
import math

D = "/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/"

# echelles imposees par le dossier
S_REF = 3.0        # ecran-canon.png : 1176 px = 392 CSS
S_CAP = 1080/392.0 # captures        : 1080 px = 392 CSS  (= 2.755102)

FILES = {
 'ref' : ('ecran-canon.png', S_REF),
 'c19' : ('capture-fiche-1080x1920.png', S_CAP),
 'c24' : ('capture-fiche-1080x2400.png', S_CAP),
 'd24' : ('capture-district-1080x2400.png', S_CAP),
 't24' : ('temoin-dock-famille-1080x2400.png', S_CAP),
 'maq' : ('maquette-hud-brennar.png', 1680/392.0),
}

_cache = {}
def img(key):
    if key not in _cache:
        f,s = FILES[key]
        im = Image.open(D+f).convert('RGB')
        _cache[key] = im
        print("  [open] %-34s %s  echelle x%.4f" % (f, im.size, s))
    return _cache[key]

def sc(key):
    return FILES[key][1]

def px(key, xc, yc):
    """pixel a une coordonnee CSS"""
    s = sc(key); im = img(key)
    return im.getpixel((int(round(xc*s)), int(round(yc*s))))

def median_box(key, x0,y0,x1,y1):
    """mediane par canal d'une fenetre donnee en CSS"""
    s = sc(key); im = img(key)
    a = im.crop((int(round(x0*s)),int(round(y0*s)),int(round(x1*s)),int(round(y1*s))))
    d = list(a.getdata())
    if not d: return None
    out=[]
    for c in range(3):
        v = sorted(p[c] for p in d); out.append(v[len(v)//2])
    return tuple(out), len(d)

def lum(c):
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def _lin(u):
    u=u/255.0
    return u/12.92 if u<=0.04045 else ((u+0.055)/1.055)**2.4

def rl(c):
    return 0.2126*_lin(c[0])+0.7152*_lin(c[1])+0.0722*_lin(c[2])

def contrast(a,b):
    la,lb = rl(a),rl(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)

def crop_css(key, x0,y0,x1,y1, scale=1):
    s = sc(key); im = img(key)
    c = im.crop((int(round(x0*s)),int(round(y0*s)),int(round(x1*s)),int(round(y1*s))))
    if scale!=1:
        c = c.resize((int(c.width*scale), int(c.height*scale)), Image.NEAREST)
    return c
