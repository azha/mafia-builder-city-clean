# m07 — DOCK complet : ronds (cerclage + diametre + centres + pas), libelles, indicateur actif, pastille
# Convention de bord DECLAREE :
#   * cerclage : bord NOMINAL = mi-amplitude entre le fond local et le PIC du cerclage.
#   * texte    : encre = L >= fond + 0.5*(pic-fond).
from lib import *

def ring_edges(im,y,x0,x1,s,label):
    prof=[(x,lum(im.getpixel((x,y)))) for x in range(x0,x1)]
    vals=[v for _,v in prof]
    bg=median(vals[:12]+vals[-12:])
    pk=max(vals)
    # pics locaux nettement au-dessus du fond ET du remplissage
    thr=bg+0.5*(pk-bg)
    segs=[];cur=None
    for i,(x,v) in enumerate(prof):
        if v>=thr and cur is None: cur=i
        if v<thr and cur is not None: segs.append((cur,i)); cur=None
    if cur is not None: segs.append((cur,len(prof)))
    print(f"    {label}: fond L={bg:.1f} pic L={pk:.1f} seuil {thr:.1f} -> {len(segs)} segment(s)")
    res=[]
    for a,b in segs:
        xa=prof[a][0]; xb=prof[b-1][0]+1
        res.append(((xa)/s,(xb)/s, max(v for _,v in prof[a:b])))
        print(f"       x {xa/s:7.2f}..{xb/s:7.2f} CSS (largeur {(xb-xa)/s:.2f}) pic L={max(v for _,v in prof[a:b]):.1f}")
    return res

print("== m07 DOCK ==")
r=load(REF); c19=load(CAP19); c24=load(CAP24)

print("\n  [A] cerclage des ronds — ligne de centre")
print("  REFERENCE y=1920 (640.00 CSS)")
er=ring_edges(r,1920,200,1000,S_REF,'ref rond1-4 (fenetre large)')
print("  JEU 1080x1920 y=1760 (638.81 CSS) — ATTENTION fond clair (eau)")
e19=ring_edges(c19,1760,180,940,S_CAP,'jeu 1920')
print("  JEU 1080x2400 y=2240 (813.0 CSS) — fond sombre")
e24=ring_edges(c24,2240,180,940,S_CAP,'jeu 2400')

print("\n  [B] couleur du cerclage et du remplissage central")
def sample(im,x,y,s,label):
    print(f"    {label}: ({x/s:.1f};{y/s:.1f}) CSS -> {im.getpixel((int(x),int(y)))}")
sample(r,214,1920,S_REF,'ref  cerclage gauche rond1')
sample(r,282,1920,S_REF,'ref  remplissage centre rond1(icone!)')
sample(r,282,1880,S_REF,'ref  remplissage haut rond1')
sample(c24,196,2240,S_CAP,'jeu  cerclage gauche rond1')
sample(c24,259,2240,S_CAP,'jeu  remplissage centre rond1')
