"""m09 — HALO, profil de RANGEES (convention r14) + Chebyshev PROPRE (label exclu).
  R(y) = moyenne(rangee) - mediane(rangee) sur l'interieur de la boite  [points de luminance]
  -> pic du CHIFFRE, VALLEE entre chiffre et libelle, pic du LIBELLE.
  PLATEAU : intervalle de d ou P(d) >= 0,90*P(2)  ; domaine restreint aux rangees
            [haut interieur .. haut du libelle - 3] pour que l'anneau ne touche JAMAIS le libelle.
Controle positif : sur la REFERENCE le halo est visible a l'oeil => P(2) >> 0 et R(y) > 0
                   entre le chiffre et le libelle.
Controle negatif : anneaux calcules sur une boite SANS encre cyan (compteur 3 du jeu = tiret)
                   -> largeur de halo doit suivre l'encre du tiret, pas celle d'un "00".
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
JET=(127,212,217)
def coeur(c,tol=28): return max(abs(c[0]-JET[0]),abs(c[1]-JET[1]),abs(c[2]-JET[2]))<=tol

def bloc(im,nom,ybox,cols,noms):
    p=im.load(); y0,y1=ybox
    for i,(cx0,cx1) in enumerate(cols,1):
        med={y: mediane([lum(p[x,y]) for x in range(cx0,cx1+1)]) for y in range(y0,y1+1)}
        moy={y: sum(lum(p[x,y]) for x in range(cx0,cx1+1))/(cx1-cx0+1) for y in range(y0,y1+1)}
        R=[(y, moy[y]-med[y]) for y in range(y0,y1+1)]
        ink=[(x,y) for y in range(y0,y1+1) for x in range(cx0,cx1+1) if coeur(p[x,y])]
        ey0=min(q[1] for q in ink); ey1=max(q[1] for q in ink)
        ex0=min(q[0] for q in ink); ex1=max(q[0] for q in ink)
        # bande du libelle : sous l'encre, premier maximum local du profil de rangees
        sous=[(y,v) for y,v in R if y>ey1+4]
        pl=max(sous,key=lambda t:t[1]) if sous else (y1,0)
        # bord haut du libelle : mi-alpha en remontant depuis pl
        vals={y:v for y,v in R}
        fond=percentile([v for _,v in sous],10)
        mid=(pl[1]+fond)/2
        yl=pl[0]
        while yl-1>ey1 and vals[yl-1]>=mid: yl-=1
        vallee=min(v for y,v in R if ey1+1<=y<=yl-1) if yl-1>ey1+1 else float('nan')
        print(f"  [{nom}] compteur {i} ({noms[i-1]})")
        print(f"     encre y{ey0}..{ey1} x{ex0}..{ex1} | libelle : pic y={pl[0]} ({pl[1]:.1f} pts), bord haut y={yl}")
        print(f"     R(y) pic CHIFFRE = {max(v for y,v in R if ey0<=y<=ey1):.2f} pts")
        print(f"     VALLEE (chiffre -> libelle) = {vallee:.2f} pts   sur y{ey1+1}..{yl-1} ({yl-1-ey1} rangees)")
        # exces 2D restreint : rangees y0..yl-4
        yy1=yl-4
        exc={}
        for y in range(y0,yy1+1):
            for x in range(cx0,cx1+1): exc[(x,y)]=lum(p[x,y])-med[y]
        masque=set(q for q in ink if q[1]<=yy1)
        cur=set(masque)
        for _ in range(2):
            nx=set(cur)
            for (x,y) in cur:
                for dx in(-1,0,1):
                    for dy in(-1,0,1):
                        q=(x+dx,y+dy)
                        if cx0<=q[0]<=cx1 and y0<=q[1]<=yy1: nx.add(q)
            cur=nx
        masque=cur
        vus=set(masque); front=set(masque); P={}
        for d in range(1,31):
            nx=set()
            for (x,y) in front:
                for dx in(-1,0,1):
                    for dy in(-1,0,1):
                        q=(x+dx,y+dy)
                        if cx0<=q[0]<=cx1 and y0<=q[1]<=yy1 and q not in vus: nx.add(q)
            if not nx: break
            vus|=nx; front=nx
            P[d]=sum(exc[q] for q in nx)/len(nx)
        p2=P.get(2,0.0)
        D=2
        for d in range(2,31):
            if d in P and p2>0.5 and P[d]>=0.90*p2: D=d
            else: break
        print(f"     P(d) [domaine y{y0}..{yy1}] : " + " ".join(f"d{d}={P[d]:.2f}" for d in sorted(P) if d<=20))
        print(f"     P(2)={p2:.2f} pts  PLATEAU = d2..d{D}")
        # symetrie SANS clamp
        haut=sum(exc[(x,y)] for y in range(max(y0,ey0-12),ey0) for x in range(ex0,ex1+1))
        bas =sum(exc[(x,y)] for y in range(ey1+1,min(yy1,ey1+12)+1) for x in range(ex0,ex1+1))
        print(f"     lumiere brute 12 rangees AU-DESSUS = {haut:.0f}   AU-DESSOUS = {bas:.0f} pts.px")
        # barycentre du halo, domaine restreint, exces > 1 pt
        nx_=ny_=dn=0.0
        for (x,y),v in exc.items():
            if (x,y) in masque or v<=1.0: continue
            nx_+=x*v; ny_+=y*v; dn+=v
        ibx=sum(q[0] for q in ink)/len(ink); iby=sum(q[1] for q in ink)/len(ink)
        if dn>0:
            print(f"     barycentre HALO=({nx_/dn:.1f},{ny_/dn:.1f})  ecart au chiffre=({nx_/dn-ibx:+.1f},{ny_/dn-iby:+.1f}) px  (masse {dn:.0f})")
        else:
            print(f"     barycentre HALO : INDEFINI (masse d'exces > 1 pt hors encre = 0)")

print("### REFERENCE"); bloc(ouvrir('reference-1080x2102.png'),'REF',(706,815),
   [(55,355),(389,689),(723,1023)],["00 REGLES","00/4 ABSORBEES","00 ENFREINTES"])
print("### JEU 2400"); bloc(ouvrir('capture-1080x2400.png'),'JEU2400',(732,841),
   [(52,354),(388,691),(724,1027)],["00 REGLES","00/4 ABSORBEES","— ENFREINTES"])
print("### JEU 1920"); bloc(ouvrir('capture-1080x1920.png'),'JEU1920',(499,609),
   [(52,354),(388,691),(724,1027)],["00 REGLES","00/4 ABSORBEES","— ENFREINTES"])
