# m01 — REPERES : profil de luminance par ligne, frontieres du chrome, bande de contenu.
# Controle positif : la largeur lue vaut 1080 sur les 3 images (annonce du dossier).
# Controle negatif : le profil doit etre NON uniforme (sinon l'instrument ne mesure rien).
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def profil(nom):
    im = Image.open(os.path.join(D,nom)).convert('RGB')
    w,h = im.size
    print(f'--- {nom} taille={im.size}')
    px = im.load()
    out=[]
    for y in range(h):
        s=0.0; mx=0.0
        for x in range(0,w,4):
            l=lum(px[x,y]); s+=l
            if l>mx: mx=l
        out.append((s/(w/4), mx))
    return im, out

for nom in ['reference-1080x2102.png','capture-1080x2400.png','capture-planche-1080x2400.png']:
    im, pr = profil(nom)
    moys=[p[0] for p in pr]
    print(f'  CONTROLE largeur==1080 : {im.size[0]==1080}')
    print(f'  CONTROLE NEGATIF profil non uniforme : min={min(moys):.2f} max={max(moys):.2f} etendue={max(moys)-min(moys):.2f}')
    # frontieres : lignes ou la moyenne saute
    sauts=[]
    for y in range(1,len(pr)):
        d = pr[y][0]-pr[y-1][0]
        if abs(d) > 3.0: sauts.append((y, round(pr[y-1][0],1), round(pr[y][0],1), round(d,1)))
    print(f'  sauts de luminance moyenne (|d|>3) : {len(sauts)}')
    for s in sauts[:40]: print('    y=%d  %.1f -> %.1f  (d=%+.1f)'%s)
    # bandes "encre" : lignes dont le max depasse 60 (du texte/trait clair present)
    bandes=[]; deb=None
    for y,(m,mx) in enumerate(pr):
        if mx>60 and deb is None: deb=y
        elif mx<=60 and deb is not None:
            if y-deb>=2: bandes.append((deb,y-1))
            deb=None
    if deb is not None: bandes.append((deb,len(pr)-1))
    print(f'  bandes contenant un pixel clair (max>60) : {len(bandes)}')
    for b in bandes: print('    y %d..%d  (h=%d)'%(b[0],b[1],b[1]-b[0]+1))
    print()
