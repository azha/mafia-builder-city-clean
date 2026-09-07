"""m24 — chrome : filet du bandeau, losange, dock. Canon HUD 1176 px (392 CSS, x3) ramene
a l'echelle du client (x2,755 par px CSS) : facteur canon->capture = 2,755/3 = 0,9184.
Controle positif : la largeur du bandeau doit valoir 1080 px dans les captures.
Controle negatif : la sonde OR ne doit rien trouver au milieu de l'art du canon (ciel).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def est_or(c):
    r,g,b=c; return r>110 and (r-b)>45 and g>70 and g<r
K=2.755/3.0
for nom in ('hud-canon-1176.png','reference-1080x2102.png','capture-1080x2400.png',
            'capture-1080x1920.png','temoin-menu-plus-1080x2400.png'):
    im=ouvrir(nom); p=im.load(); W,H=im.size
    rows=[(y,sum(1 for x in range(W) if est_or(p[x,y]))) for y in range(0,min(400,H))]
    b=bandes(rows,int(0.55*W))
    print(f"  {nom} : filet(s) pleine largeur dans les 400 1eres rangees : {[(a,c) for a,c,_ in b]}")
    if nom=='hud-canon-1176.png':
        for a,c,_ in b: print(f"     -> ramene a l'echelle client : y {a*K:.1f}..{c*K:.1f}")
    # objets or petits sous le filet
    fil = b[0][1] if b else 150
    rows2=[]
    for y in range(fil+2, min(fil+180,H)):
        xs=[x for x in range(W) if est_or(p[x,y])]
        if xs and len(xs)<=260: rows2.append((y,min(xs),max(xs),len(xs)))
    if rows2:
        blocs=[];cur=[rows2[0]]
        for r in rows2[1:]:
            if r[0]-cur[-1][0]<=3: cur.append(r)
            else: blocs.append(cur); cur=[r]
        blocs.append(cur)
        for bl in blocs:
            xmin=min(r[1] for r in bl); xmax=max(r[2] for r in bl)
            print(f"     objet OR : y{bl[0][0]}..{bl[-1][0]} (h={bl[-1][0]-bl[0][0]+1}) x{xmin}..{xmax} (w={xmax-xmin+1})"
                  + (f"  -> echelle client y{bl[0][0]*K:.0f}..{bl[-1][0]*K:.0f} x{xmin*K:.0f}..{xmax*K:.0f} (w={(xmax-xmin+1)*K:.0f})" if nom=='hud-canon-1176.png' else ""))
    else:
        print("     aucun objet OR isole sous le filet")
    print()
