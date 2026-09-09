# m24 — (A) LAVIS DE CHALEUR sur l'aire d'un quartier : le filtre "or" du m23 ne l'attrape pas
#       (khaki sur navy = (86,77,62), r-b=24 < 70). Je mesure directement la COULEUR MEDIANE de l'aire.
#       CONTROLE POSITIF : un quartier SANS lavis (LE TREILLIS) doit rendre la meme couleur des deux cotes.
#       (B) PIED DE PAGE de la maquette (legende + voile) : present / absent.
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
S,TX,TY=1.0220,-12.0,8.0
def Y(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def medc(px,W,H,box,step=3):
    x0,y0,x1,y1=box; v=[[],[],[]]
    for y in range(y0,y1,step):
        for x in range(x0,x1,step):
            xx,yy=max(0,min(W-1,x)),max(0,min(H-1,y))
            p=px[xx,yy]
            for k in range(3): v[k].append(p[k])
    return tuple(int(statistics.median(v[k])) for k in range(3))
print("\n(A) AIRES DE QUARTIER — couleur mediane (fenetres choisies HORS noms et hors ecussons)")
Z={"LES BASSINS (lavis warm en maquette)":(70,380,290,440),
   "HAUTES-MARCHES (lavis warm en maquette)":(430,600,720,640),
   "LA LISIERE (lueur 'mien' en maquette)":(830,1560,990,1610),
   "LE TREILLIS (sans lavis) [CTRL+]":(80,1420,250,1470),
   "SARNES (sans lavis) [CTRL+]":(830,480,1000,520),
   "DEPOT-EST (sans lavis) [CTRL+]":(820,950,1000,1000)}
print(f"   {'aire':42s}{'REF':18s}{'CAP':18s}{'delta RGB':>18}")
for n,b in Z.items():
    a=medc(RP,1080,2102,b)
    cb=(int(S*b[0]+TX),int(S*b[1]+TY),int(S*b[2]+TX),int(S*b[3]+TY))
    c=medc(CP,1080,2400,cb)
    print(f"   {n:42s}{str(a):18s}{str(c):18s}{str(tuple(c[k]-a[k] for k in range(3))):>18}")
print("\n(B) PIED DE PAGE de la maquette (legende italique + voile) — present en jeu ?")
# la maquette : deux lignes italiques ref y 1955..2050 ; le voile descend de ~y 1900
print("   REFERENCE, encre claire (L>110) par bande de 30 px, x 100..1000 :")
for y0 in range(1930,2085,30):
    n=sum(1 for y in range(y0,min(y0+30,2085)) for x in range(100,1000) if Y(RP[x,y])>110)
    print(f"     ref y {y0:4d}..{min(y0+29,2084):4d} : {n:5d} px")
print("   CAPTURE, memes bandes recalees :")
for y0 in range(1930,2085,30):
    c0=int(S*y0+TY); c1=int(S*min(y0+30,2085)+TY)
    n=sum(1 for y in range(c0,min(c1,2136)) for x in range(int(S*100+TX),int(S*1000+TX)) if Y(CP[x,y])>110)
    print(f"     cap (ref {y0:4d}..{min(y0+29,2084):4d}) : {n:5d} px")
print("\n   VOILE du pied de page : luminance mediane d'une bande de peinture 'temoin' en bas")
for y0 in (1850,1900,1950,2000,2050):
    r=[Y(RP[x,y]) for y in range(y0,y0+25) for x in range(600,1000,2)]
    c=[Y(CP[x,y]) for y in range(int(S*y0+TY),int(S*(y0+25)+TY)) for x in range(int(S*600+TX),int(S*1000+TX),2)]
    print(f"     ref y {y0}: REF L med {statistics.median(r):6.2f}  CAP L med {statistics.median(c):6.2f}  delta {statistics.median(c)-statistics.median(r):+6.2f}")
print("\n(C) BANDE DE LEGENDE du r1 (F6) — la maquette n'en a pas ; en reste-t-il une en jeu ?")
# la bande r1 etait a cap (40,2108)-(500,2136) : puce grise + 3 pastilles couleur + texte blanc
n=sum(1 for y in range(2095,2136) for x in range(40,520)
      if CP[x,y][0]>150 and abs(CP[x,y][0]-CP[x,y][1])<20 and abs(CP[x,y][1]-CP[x,y][2])<20)
print(f"   px gris/blancs clairs dans (40,2095)-(520,2136) : {n}")
for c,nm in (((242,189,49),"pastille or"),((61,178,86),"pastille verte"),((209,66,66),"pastille rouge")):
    k=sum(1 for y in range(2090,2140) for x in range(0,540)
          if all(abs(CP[x,y][i]-c[i])<30 for i in range(3)))
    print(f"   {nm} {c} : {k} px")
