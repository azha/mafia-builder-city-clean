# m20 — GOUTTIERE, CADRAGE, REPERES PEINTS, BANDE BASSE, PASTILLE "Chaleur".
# CONVENTION DE BORD : mi-alpha nominal — l'epaisseur d'un trait est prise entre les deux traversees
#   du niveau (fond + coeur)/2 le long d'un profil perpendiculaire.
# RECALAGE (m06) : cap = 1.0220*ref + (-12.0, +8.0).
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
S,TX,TY=1.0220,-12.0,8.0
def Y(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def med(px,cx,cy,r=6):
    v=[[],[],[]]
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            p=px[x,y]
            for k in range(3): v[k].append(p[k])
    return tuple(int(statistics.median(v[k])) for k in range(3))

print("\n[1] GOUTTIERE / bornes du contenu dans la CAPTURE")
for y in (200,204,215,231,232,2135,2136,2151,2152,2160):
    print(f"   y={y:5d} L moyen={statistics.mean(Y(CP[x,y]) for x in range(0,1080,4)):6.2f} px(60)={CP[60,y]} px(540)={CP[540,y]} px(1020)={CP[1020,y]}")
print("   -> bandeau uni jusqu'a y=231 ; peinture 232..2135 ; bande sombre 2136..2151 ; dock a partir de 2152")
# la bande sombre
band=[Y(CP[x,y]) for y in range(2136,2152) for x in range(0,1080,3)]
just=[Y(CP[x,y]) for y in range(2120,2136) for x in range(0,1080,3)]
print(f"   bande 2136..2151 : L med {statistics.median(band):.1f}  |  16 px juste au-dessus : L med {statistics.median(just):.1f}  => chute {statistics.median(just)-statistics.median(band):+.1f} L sur 16 px")
print(f"   REFERENCE, 16 dernieres lignes de contenu (2069..2084) : L med {statistics.median([Y(RP[x,y]) for y in range(2069,2085) for x in range(0,1080,3)]):.1f}")

print("\n[2] CADRAGE — part de la peinture visible (recalage m06)")
print(f"   X : ref {(0-TX)/S:6.1f} .. {(1079-TX)/S:6.1f}  (la reference va de 0 a 1079)  => perdu {(0-TX)/S:.1f} px a gauche, {1079-(1079-TX)/S:.1f} px a droite")
print(f"   Y : ref {(232-TY)/S:6.1f} .. {(2135-TY)/S:6.1f}  (contenu de la reference 219..2084)")
print(f"   surface de peinture visible : {100*((1079-TX)/S-(0-TX)/S)/1080:.2f} % en X, {100*((2135-TY)/S-(232-TY)/S)/(2084-219):.2f} % en Y")

print("\n[3] MARGES des noms au cadre (CAPTURE) — un nom coupe serait un BLOQUANT")
NOMSCAP={"LES BASSINS":(89,478,244,519),"SARNES":(876,463,970,494),"LE VERRE":(871,1399,983,1448),
 "LA CHANCELLERIE":(56,1934,270,2017),"PONT-GRIS":(840,1944,970,1974),"ORSEL":(113,1688,191,1704),
 "LA LISIERE":(853,1664,994,1698),"VERRIER":(881,671,992,708)}
mg=[]
for n,(x0,y0,x1,y1) in NOMSCAP.items():
    mg.append((x0,1079-x1,n))
    print(f"   {n:18s} x {x0:4d}..{x1:4d}  marge gauche {x0:4d}  marge droite {1079-x1:4d}")
print(f"   -> marge minimale gauche {min(m[0] for m in mg)} px, droite {min(m[1] for m in mg)} px : aucun nom coupe")
print("   REFERENCE : LA CHANCELLERIE commence a x=? ", end="")
xs=[x for y in range(1860,1950) for x in range(0,120) if Y(RP[x,y])>70 and 5<=(RP[x,y][0]-RP[x,y][2])<=95]
print(f"{min(xs) if xs else 'aucun'} (bord de cadre a x=0)")

print("\n[4] REPERES PEINTS — la route or, la rose des vents, le fleuve")
# route or : profil vertical a x fixe, la ou elle traverse
for tag,px,x,ys in (("REF",RP,300,range(620,680)),("CAP",CP,295,range(645,705))):
    prof=[(y,Y(px[x,y]),px[x,y]) for y in ys]
    pic=max(prof,key=lambda t:t[1])
    print(f"   route or {tag} a x={x} : pic L={pic[1]:.1f} a y={pic[0]}, couleur {pic[2]}")
# largeur a mi-alpha
def largeur_mi(px,x,ys):
    prof=[(y,Y(px[x,y])) for y in ys]
    pic=max(prof,key=lambda t:t[1]); base=statistics.median([v for _,v in prof])
    mi=(pic[1]+base)/2
    ok=[y for y,v in prof if v>=mi]
    return max(ok)-min(ok)+1, round(pic[1],1), round(base,1), round(mi,1)
print(f"   largeur a mi-alpha  REF {largeur_mi(RP,300,range(620,680))}  |  CAP {largeur_mi(CP,295,range(645,705))}")
# rose des vents : bras nord
print("   rose des vents (bras nord) — premiere ligne claire sur l'axe :")
for tag,px,x,ys in (("REF",RP,985,range(520,620)),("CAP",CP,995,range(540,640))):
    f=[y for y in ys if Y(px[x,y])>90]
    print(f"     {tag} x={x} : encre claire de y={min(f) if f else None} a y={max(f) if f else None}  (n={len(f)})")
print(f"   fleuve, mediane 41x41  REF(760,1100)={med(RP,760,1100,20)}  CAP recale={med(CP,int(S*760+TX),int(S*1100+TY),20)}")

print("\n[5] PASTILLE 'Chaleur : affichee' (bas gauche de la CAPTURE)")
xs=[];ys=[]
for y in range(2060,2140):
    for x in range(0,300):
        p=CP[x,y]
        if abs(p[0]-p[1])<10 and abs(p[1]-p[2])<10 and 70<Y(p)<230: xs.append(x); ys.append(y)
if xs:
    print(f"   boite grise ~ x {min(xs)}..{max(xs)}  y {min(ys)}..{max(ys)}  ({max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} px)")
    print(f"   fond de la pastille (mediane 6x6 au centre) : {med(CP,(min(xs)+max(xs))//2,(min(ys)+max(ys))//2,5)}")
    # ce qu'elle recouvre dans la reference, au meme endroit recale
    rx0=int((min(xs)-TX)/S); ry0=int((min(ys)-TY)/S); rx1=int((max(xs)-TX)/S); ry1=int((max(ys)-TY)/S)
    print(f"   zone homologue dans la REFERENCE : x {rx0}..{rx1} y {ry0}..{ry1}")
    print(f"   contenu de la reference la : L med {statistics.median([Y(RP[x,y]) for y in range(ry0,ry1+1) for x in range(rx0,rx1+1)]):.1f}, L max {max(Y(RP[x,y]) for y in range(ry0,ry1+1) for x in range(rx0,rx1+1)):.1f}")
