# m1 — geometrie: bandeau, dock, bbox du contenu, dans la CAPTURE et la REFERENCE.
# Controle positif: largeur des deux images = 1080 (echelle x3,6 des deux cotes, cf dossier).
from PIL import Image

def med(im, x0,y0,x1,y1):
    px = list(im.crop((x0,y0,x1,y1)).getdata())
    n=len(px)
    return tuple(sorted(p[c] for p in px)[n//2] for c in range(3))

def lum(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])

cap = Image.open('../capture-1080x2400.png').convert('RGB')
ref = Image.open('../reference-1080x2102.png').convert('RGB')
print('OUVERT capture', cap.size, ' reference', ref.size)
print('CONTROLE POSITIF largeur: capture=%d reference=%d  (attendu 1080/1080)' % (cap.width, ref.width))

# --- profil de luminance par ligne, colonne mediane de gauche (x 20..60) pour eviter le manometre
def profil(im, x0, x1, label):
    out=[]
    for y in range(im.height):
        out.append(lum(med(im, x0, y, x1, y+1)))
    return out

# 1) bandeau de la capture: la regle orange. On cherche la ligne ou le canal R depasse largement B.
print('\n--- CAPTURE: recherche de la regle orange du bandeau (x 900..1050) ---')
for y in range(90, 160):
    c = med(cap, 900, y, 1050, y+1)
    if c[0] > c[2] + 25:
        print('  y=%4d  rgb=%s  (R-B=%d)' % (y, c, c[0]-c[2]))

print('\n--- CAPTURE: hauteur du dock (bas). Profil de luminance x 20..80 ---')
prev=None
for y in range(2200, 2400):
    c = med(cap, 20, y, 80, y+1)
    if prev is None or abs(lum(c)-lum(prev))>0.0015:
        print('  y=%4d rgb=%s L=%.4f' % (y, c, lum(c)))
    prev=c
