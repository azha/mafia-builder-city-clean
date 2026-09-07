"""m08 — CERTIFICATION DU HALO. Methode declaree AVANT les chiffres :

  fond      : mediane de la RANGEE, calculee sur l'interieur de la boite du compteur
              (l'encre est minoritaire => la mediane est le fond, gradient compris).
  exces     : exces(x,y) = lum(x,y) - mediane(rangee y).  Unite = "points" de luminance.
  encre     : coeur cyan (|c - (127,212,217)| <= 28) DILATE de 2 px (frange d'anti-crenelage).
  distance  : Chebyshev d(x,y) = anneaux successifs autour du masque d'encre, d = 1..30.
  profil    : P(d) = moyenne de l'exces sur l'anneau d, restreint a l'interieur de la boite.
  PLATEAU   : plus grand intervalle [2, D] ou P(d) >= 0,90 * P(2)  (un halo qui RAYONNE
              decroit des d=2 ; une tache POSEE garde sa valeur puis tombe d'un coup).
  VALLEE    : minimum du profil de RANGEES (moyenne(rangee) - mediane(rangee)) entre le bas
              de l'encre du chiffre et le haut de la bande du libelle, en points.
  BARYCENTRE: centroide pondere par l'exces sur 2 <= d <= 30, compare au centroide de l'encre.
  SYMETRIE  : somme de l'exces sur les 12 rangees AU-DESSUS de l'encre / 12 rangees AU-DESSOUS,
              restreint aux colonnes de l'encre.
  LARGEUR   : largeur a mi-hauteur du profil de COLONNES de l'exces, sur la bande du chiffre —
              doit SUIVRE la largeur de l'encre d'un compteur a l'autre.
Controle positif : sur la REFERENCE, le halo est connu present => P(2) doit etre nettement > 0.
Controle negatif : une bande de la meme boite SANS encre (les 8 rangees du haut) doit rendre
                   un exces ~ 0.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
JET=(127,212,217)
def coeur(c,tol=28): return max(abs(c[0]-JET[0]),abs(c[1]-JET[1]),abs(c[2]-JET[2]))<=tol

def analyse(im, nom, ybox, cols, labels):
    p=im.load()
    y0,y1=ybox
    for i,(cx0,cx1) in enumerate(cols,1):
        # fond = mediane de rangee sur l'interieur
        med={y: mediane([lum(p[x,y]) for x in range(cx0,cx1+1)]) for y in range(y0,y1+1)}
        exc={}
        for y in range(y0,y1+1):
            for x in range(cx0,cx1+1):
                exc[(x,y)]=lum(p[x,y])-med[y]
        ink=set((x,y) for y in range(y0,y1+1) for x in range(cx0,cx1+1) if coeur(p[x,y]))
        if not ink:
            print(f"  [{nom}] compteur {i} : pas d'encre"); continue
        # dilatation 2 px
        cur=set(ink)
        for _ in range(2):
            nxt=set(cur)
            for (x,y) in cur:
                for dx in(-1,0,1):
                    for dy in(-1,0,1):
                        q=(x+dx,y+dy)
                        if cx0<=q[0]<=cx1 and y0<=q[1]<=y1: nxt.add(q)
            cur=nxt
        masque=cur
        xs=[q[0] for q in ink]; ys=[q[1] for q in ink]
        ibx=sum(xs)/len(xs); iby=sum(ys)/len(ys)
        # anneaux de Chebyshev
        vus=set(masque); front=set(masque); prof=[]
        for d in range(1,31):
            nxt=set()
            for (x,y) in front:
                for dx in(-1,0,1):
                    for dy in(-1,0,1):
                        q=(x+dx,y+dy)
                        if cx0<=q[0]<=cx1 and y0<=q[1]<=y1 and q not in vus: nxt.add(q)
            if not nxt: break
            vus|=nxt; front=nxt
            vals=[exc[q] for q in nxt]
            prof.append((d, sum(vals)/len(vals), len(vals)))
        P={d:v for d,v,_ in prof}
        p2=P.get(2,0.0)
        # plateau
        D=2
        for d in range(2,31):
            if d in P and p2>0 and P[d]>=0.90*p2: D=d
            else: break
        # barycentre du halo (2<=d<=30, exces positif seulement)
        num_x=num_y=den=0.0
        for (x,y),v in exc.items():
            if (x,y) in masque: continue
            if v<=0: continue
            num_x+=x*v; num_y+=y*v; den+=v
        hbx=num_x/den if den else float('nan'); hby=num_y/den if den else float('nan')
        # symetrie haut/bas : 12 rangees, colonnes de l'encre
        ex0,ex1=min(xs),max(xs); ey0,ey1=min(ys),max(ys)
        haut=sum(max(0.0,exc[(x,y)]) for y in range(max(y0,ey0-12),ey0) for x in range(ex0,ex1+1) if (x,y) in exc)
        bas =sum(max(0.0,exc[(x,y)]) for y in range(ey1+1,min(y1,ey1+12)+1) for x in range(ex0,ex1+1) if (x,y) in exc)
        # largeur a mi-hauteur du profil de colonnes, sur la bande du chiffre
        colprof=[]
        for x in range(cx0,cx1+1):
            colprof.append((x, sum(max(0.0,exc[(x,y)]) for y in range(ey0,ey1+1))))
        vmax=max(v for _,v in colprof); vmin=min(v for _,v in colprof)
        mid=(vmax+vmin)/2
        sup=[x for x,v in colprof if v>=mid]
        larg=(max(sup)-min(sup)+1) if sup else 0
        print(f"  [{nom}] compteur {i} ({labels[i-1]})")
        print(f"     encre : x{ex0}..{ex1} (w={ex1-ex0+1})  y{ey0}..{ey1} (h={ey1-ey0+1})  barycentre=({ibx:.1f},{iby:.1f})")
        print(f"     profil P(d) : " + "  ".join(f"d{d}={v:.2f}" for d,v,_ in prof[1:30:2]))
        print(f"     P(2)={p2:.2f} pts   PLATEAU = d2..d{D} (largeur {D-1} px)")
        print(f"     rapports P(d)/P(2) : " + "  ".join(f"d{d}={(P[d]/p2 if p2 else 0):.2f}" for d in (2,4,6,8,10,14,20,30) if d in P))
        print(f"     barycentre HALO=({hbx:.1f},{hby:.1f})  ecart au chiffre = ({hbx-ibx:+.1f},{hby-iby:+.1f}) px")
        print(f"     lumiere 12 rangees AU-DESSUS = {haut:.0f} pts.px   AU-DESSOUS = {bas:.0f} pts.px   rapport bas/haut = {(bas/haut if haut else float('inf')):.2f}")
        print(f"     largeur du halo a mi-hauteur (bande du chiffre) = {larg} px   (encre {ex1-ex0+1} px)  ratio = {larg/(ex1-ex0+1):.2f}")
    # ctrl negatif : 8 rangees du haut de la boite (sans encre)
    cx0,cx1=cols[0]
    vals=[]
    for y in range(y0,y0+8):
        m=mediane([lum(p[x,y]) for x in range(cx0,cx1+1)])
        vals += [lum(p[x,y])-m for x in range(cx0,cx1+1)]
    print(f"  [ctrl negatif] exces moyen sur 8 rangees sans encre = {sum(vals)/len(vals):.3f} pts (attendu ~0)")

print("### REFERENCE")
analyse(ouvrir('reference-1080x2102.png'), 'REF', (706,815), [(55,355),(389,689),(723,1023)],
        ["00 REGLES DONNEES","00/4 ABSORBEES","00 ENFREINTES"])
print("### JEU 2400")
analyse(ouvrir('capture-1080x2400.png'), 'JEU2400', (732,841), [(52,354),(388,691),(724,1027)],
        ["00 REGLES DONNEES","00/4 ABSORBEES","— ENFREINTES"])
print("### JEU 1920")
analyse(ouvrir('capture-1080x1920.png'), 'JEU1920', (499,609), [(52,354),(388,691),(724,1027)],
        ["00 REGLES DONNEES","00/4 ABSORBEES","— ENFREINTES"])
