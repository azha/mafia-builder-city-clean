# m17 — CONTRASTE des noms (WCAG) et CONTROLE NEGATIF du profil radial du m16.
# CONTROLE NEGATIF (celui qui manquait au m16) : je pose une encre SYNTHETIQUE (un disque de 9 px)
#   dans une fenetre de peinture PLATE (le fleuve) et je verifie que le profil radial est PLAT.
#   Sans lui, un profil en cloche pourrait venir de la machinerie de distance, pas de l'image.
# WCAG : L = 0,2126 R' + 0,7152 G' + 0,0722 B' sur canaux LINEARISES ; ratio = (L1+0,05)/(L2+0,05).
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
S,TX,TY=1.0220,-12.0,8.0
def lin(c):
    c/=255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def Lw(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
def ratio(a,b):
    la,lb=Lw(a),Lw(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def Y(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

# ---------- CONTROLE NEGATIF ----------
print("\nCTRL- profil radial sur une encre SYNTHETIQUE posee dans le FLEUVE (peinture plate) :")
for tag,px,cx,cy in (("REF",RP,780,1090),("CAP",CP,785,1122)):
    buck={}
    for dy in range(-60,61):
        for dx in range(-60,61):
            d=int((dx*dx+dy*dy)**0.5)
            if 5<=d<=55: buck.setdefault(d,[]).append(Y(px[cx+dx,cy+dy]))
    base=statistics.median([statistics.median(buck[d]) for d in range(45,56) if d in buck])
    vals=[(d,round(statistics.median(buck[d])-base,2)) for d in (5,8,12,20,30,40)]
    print(f"  {tag} centre({cx},{cy}) base={base:.2f} ; ecart a la base par anneau : {vals}")
    print(f"       -> amplitude max sur d=5..40 : {max(abs(v) for _,v in vals):.2f} L (attendu ~0 : profil PLAT)")

# ---------- CONTRASTES ----------
def encre_et_fond(px,W,H,box,seuil=110):
    x0,y0,x1,y1=box
    ps=[]
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            R,G,B=px[x,y]
            if Y((R,G,B))>seuil and 10<=(R-B)<=95 and G>100: ps.append((x,y))
    if len(ps)<100: return None
    lum=sorted(((Y(px[x,y]),x,y) for x,y in ps),reverse=True)
    top=lum[:max(8,len(lum)//7)]
    enc=tuple(int(statistics.median([px[x,y][k] for _,x,y in top])) for k in range(3))
    ink={(x,y) for x,y in ps}
    proche=[];loin=[]
    for y in range(max(0,y0-45),min(H,y1+46)):
        for x in range(max(0,x0-45),min(W,x1+46)):
            if (x,y) in ink: continue
            dm=999
            for (ax,ay) in ((x,y),):
                pass
            # distance approx : plus proche colonne/ligne d'encre en 8-voisinage elargi
            for r in (1,2,3,4,5,6,8,10,14,20,28,40):
                found=False
                for dy in (-r,r):
                    for dx in range(-r,r+1,max(1,r//3)):
                        if (x+dx,y+dy) in ink: found=True;break
                    if found:break
                if not found:
                    for dx in (-r,r):
                        for dy in range(-r,r+1,max(1,r//3)):
                            if (x+dx,y+dy) in ink: found=True;break
                        if found:break
                if found: dm=r;break
            if dm<=3: proche.append(px[x,y])
            elif 22<=dm<=40: loin.append(px[x,y])
    if not proche or not loin: return None
    fp=tuple(int(statistics.median([p[k] for p in proche])) for k in range(3))
    fl=tuple(int(statistics.median([p[k] for p in loin])) for k in range(3))
    return enc,fp,fl,len(ps)
CAS=[("SAINT-BRAND",(87,931,278,986)),("DEPOT-EST",(848,925,1012,987)),
     ("LE TREILLIS",(80,1394,249,1442)),("MARNE-BASSE",(451,1413,652,1460)),
     ("LES ENTREPOTS",(460,926,684,996)),("LES BASSINS",(75,462,260,535))]
print(f"\n{'nom':16s}{'img':5s}| {'encre':16s}{'bord d<=3':16s}{'peinture d22-40':17s}| {'C encre/bord':>13} {'C encre/peint':>14}")
for nom,cb in CAS:
    rb=(int((cb[0]-TX)/S),int((cb[1]-TY)/S),int((cb[2]-TX)/S),int((cb[3]-TY)/S))
    for tag,px,W,H,box,s in (("REF",RP,1080,2102,rb,110),("CAP",CP,1080,2400,cb,110)):
        r=encre_et_fond(px,W,H,box,s)
        if not r: print(f"{nom:16s}{tag:5s}| IMPOSSIBLE"); continue
        enc,fp,fl,n=r
        print(f"{nom:16s}{tag:5s}| {str(enc):16s}{str(fp):16s}{str(fl):17s}| {ratio(enc,fp):13.2f} {ratio(enc,fl):14.2f}")
print("\nPlancher de doctrine : 4,5:1 petit texte, 3:1 grand texte.")
