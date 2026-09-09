# m11 : la capture porte-t-elle une teinte de chaleur/conviction QUELQUE PART ?
# On cherche les cellules ou la CAPTURE est plus CHAUDE que la reference alignee
# (dR - dB eleve) hors plaques et hors chrome, et on liste toute la carte des ecarts
# par tranches. Controle positif : les 3 zones connues (BASSINS, HAUTES-MARCHES,
# LISIERE) doivent sortir en "ref plus chaude" (signe oppose).
from PIL import Image, ImageFilter
import statistics
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rr=ref.resize((int(1080*S),int(2102*S)),Image.LANCZOS)
canv=Image.new('RGB',(1080,2400)); canv.paste(rr,(DX,DY))
a=canv.filter(ImageFilter.GaussianBlur(6)).load(); b=cap.filter(ImageFilter.GaussianBlur(6)).load()
plaques=[(835,462,1011,495),(462,479,638,512),(78,483,254,516),(853,682,1029,714),
(492,703,668,736),(91,709,267,742),(841,940,1017,973),(94,943,270,975),(484,945,660,978),
(76,1402,252,1435),(839,1406,1015,1440),(463,1421,639,1454),(829,1666,1005,1699),
(63,1680,240,1713),(441,1687,617,1720),(816,1943,993,1975),(75,1955,251,1992),(440,1960,616,1993)]
def surplaque(x,y):
    return any(X0-10<=x<=X1+10 and Y0-10<=y<=Y1+10 for X0,Y0,X1,Y1 in plaques)
CW=CH=30
res=[]
for cy in range(250,2090,CH):
    for cx in range(0,1050,CW):
        if surplaque(cx+CW//2,cy+CH//2): continue
        dr=db=0;n=0
        for y in range(cy,cy+CH,3):
            for x in range(cx,cx+CW,3):
                p,q=a[x,y],b[x,y]; dr+=q[0]-p[0]; db+=q[2]-p[2]; n+=1
        res.append((cx,cy,dr/n,db/n,(dr-db)/n))
res.sort(key=lambda r:-r[4])
print(f"\ncellules 30x30 hors plaques : {len(res)}")
print(" >>> CAPTURE plus CHAUDE que la reference (dR-dB max) : 12 premieres")
for r in res[:12]: print(f"   x={r[0]:4d} y={r[1]:4d}  dR={r[2]:+6.1f}  dB={r[3]:+6.1f}  chaleur={r[4]:+6.1f}")
print(" >>> REFERENCE plus CHAUDE que la capture (dR-dB min) : 12 premieres")
for r in res[-12:]: print(f"   x={r[0]:4d} y={r[1]:4d}  dR={r[2]:+6.1f}  dB={r[3]:+6.1f}  chaleur={r[4]:+6.1f}")
vals=[r[4] for r in res]
print(f"\n mediane chaleur = {statistics.median(vals):+.2f} ; 95e centile = {sorted(vals)[int(.95*len(vals))]:+.2f} ; 5e = {sorted(vals)[int(.05*len(vals))]:+.2f}")
print(f" nb de cellules avec chaleur > +12 : {sum(1 for v in vals if v>12)}   < -12 : {sum(1 for v in vals if v<-12)}")
