# m19 — SERIF vs LINEALE, 2e tentative : longueur MOYENNE des segments horizontaux d'encre
#       dans la bande BASSE (empattements) rapportee a la bande MEDIANE (fûts nus).
#       Romaine a empattements : les pieds elargissent le trait en bas => rapport > 1.
#       Lineale monoline : rapport ~ 1.
# CONTROLE POSITIF OBLIGATOIRE : "LE THRENNY" porte les MEMES glyphes des deux cotes (peint dans la
#       texture) => son rapport doit etre le MEME. Si l'ecart de controle est du meme ordre que
#       l'ecart mesure, l'instrument NE DISCRIMINE PAS et je le dis.
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
S,TX,TY=1.0220,-12.0,8.0
def Y(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def cream(p):
    R,G,B=p; return Y(p)>110 and 10<=(R-B)<=95 and G>100
def cold(p):
    R,G,B=p; return Y(p)>120 and (B-R)>20
def runs(px,box,f,ang):
    x0,y0,x1,y1=box
    import math
    t=math.tan(math.radians(ang))
    pts={}
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            if f(px[x,y]):
                yy = y - t*(x-(x0+x1)/2)     # de-inclinaison : ramene la ligne de base a l'horizontale
                pts.setdefault(x,[]).append(yy)
    if not pts: return None
    allv=[v for l in pts.values() for v in l]
    allv.sort(); lo=allv[int(len(allv)*0.02)]; hi=allv[int(len(allv)*0.98)]
    h=hi-lo
    if h<10: return None
    def moy_run(a,b):
        # segments horizontaux d'encre dans la bande [lo+a*h, lo+b*h]
        band={}
        for x,l in pts.items():
            for v in l:
                if lo+a*h <= v <= lo+b*h: band.setdefault(round(v),set()).add(x)
        Ls=[]
        for yy,xs in band.items():
            xs=sorted(xs); c=1
            for i in range(1,len(xs)):
                if xs[i]==xs[i-1]+1: c+=1
                else: Ls.append(c); c=1
            Ls.append(c)
        Ls=[v for v in Ls if v>=1]
        return (statistics.mean(Ls), len(Ls)) if Ls else (0,0)
    mb,nb=moy_run(0.78,0.99); mm,nm=moy_run(0.35,0.62); mh,nh=moy_run(0.01,0.20)
    return {"h":round(h,1),"bas":round(mb,2),"nb":nb,"mil":round(mm,2),"nm":nm,"haut":round(mh,2),"nh":nh,
            "bas/mil":round(mb/mm,3) if mm else None,"haut/mil":round(mh/mm,3) if mm else None}
CAS=[("LE TREILLIS",(80,1394,249,1442),-0.10,0.28),("MARNE-BASSE",(451,1413,652,1460),0.48,0.20),
     ("SAINT-BRAND",(87,931,278,986),3.09,3.14),("DEPOT-EST",(848,925,1012,987),7.06,7.07),
     ("LES BASSINS",(75,462,260,535),-9.96,-10.15)]
print(f"{'nom':14s}{'img':4s}{'h':>6}{'run bas':>9}{'run mil':>9}{'run haut':>10}{'bas/mil':>9}{'haut/mil':>10}")
ecarts=[]
for nom,cb,ac,ar in CAS:
    rb=(int((cb[0]-TX)/S),int((cb[1]-TY)/S),int((cb[2]-TX)/S),int((cb[3]-TY)/S))
    a=runs(RP,rb,cream,ar); b=runs(CP,cb,cream,ac)
    if not a or not b: print(f"{nom:14s} IMPOSSIBLE"); continue
    print(f"{nom:14s}{'REF':4s}{a['h']:>6}{a['bas']:>9}{a['mil']:>9}{a['haut']:>10}{a['bas/mil']:>9}{a['haut/mil']:>10}")
    print(f"{'':14s}{'CAP':4s}{b['h']:>6}{b['bas']:>9}{b['mil']:>9}{b['haut']:>10}{b['bas/mil']:>9}{b['haut/mil']:>10}")
    ecarts.append(a['bas/mil']-b['bas/mil'])
print(f"\nECART bas/mil (REF - CAP) : {[round(e,3) for e in ecarts]}  med {statistics.median(ecarts):+.3f}")
print("\nCONTROLE POSITIF — 'LE THRENNY', MEMES glyphes des deux cotes :")
a=runs(RP,(415,1122,660,1155),cold,-0.76); b=runs(CP,(413,1155,658,1189),cold,-0.76)
print(f"  REF h={a['h']} bas/mil={a['bas/mil']} haut/mil={a['haut/mil']} | CAP h={b['h']} bas/mil={b['bas/mil']} haut/mil={b['haut/mil']}")
print(f"  bruit du controle sur bas/mil : {abs(a['bas/mil']-b['bas/mil']):.3f}")
print(f"  => l'instrument DISCRIMINE si |ecart mesure| >> bruit du controle.")
