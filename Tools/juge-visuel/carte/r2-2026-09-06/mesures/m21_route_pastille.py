# m21 — (A) profil de la ROUTE OR (le m20 comparait deux largeurs a mi-alpha derivees d'une ligne de base
#       differente : je colle les DEUX profils bruts). (B) la pastille "Chaleur" localisee proprement.
# CONVENTION DE BORD : mi-alpha nominal, niveau = (coeur + fond local)/2, fond local = mediane des
#       12 lignes les plus eloignees du pic dans la fenetre.
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
S,TX,TY=1.0220,-12.0,8.0
def Y(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
print("\n(A) ROUTE OR — profils verticaux bruts, aux memes points de la PEINTURE (recalage m06)")
for rx in (200,300,500,700):
    cx=int(round(S*rx+TX))
    print(f"  ref x={rx} / cap x={cx}")
    rys=list(range(620,690)); cys=[int(round(S*y+TY)) for y in rys]
    pr=[Y(RP[rx,y]) for y in rys]; pc=[Y(CP[cx,y]) for y in cys]
    ipr=pr.index(max(pr)); ipc=pc.index(max(pc))
    print("    REF (ref_y {}..{}) : ".format(rys[0],rys[-1]) + " ".join(f"{v:5.1f}" for v in pr[max(0,ipr-8):ipr+9]))
    print("    CAP (memes points) : " + " ".join(f"{v:5.1f}" for v in pc[max(0,ipc-8):ipc+9]))
    def mi(p):
        pic=max(p); base=statistics.median(sorted(p)[:12]); niv=(pic+base)/2
        idx=[i for i,v in enumerate(p) if v>=niv]
        return (max(idx)-min(idx)+1, round(pic,1), round(base,1))
    print(f"    largeur a mi-alpha REF {mi(pr)}  CAP {mi(pc)}")
print("\n(B) PASTILLE 'Chaleur' — rectangle clair en bas a gauche de la CAPTURE")
best=None
for y0 in range(2050,2130):
    for x0 in range(0,60):
        pass
# detection : pixels nettement plus clairs que la peinture, gris neutre, dans le coin bas-gauche
pts=[(x,y) for y in range(2040,2140) for x in range(0,320)
     if Y(CP[x,y])>60 and abs(CP[x,y][0]-CP[x,y][2])<14 and abs(CP[x,y][0]-CP[x,y][1])<14]
if pts:
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"   {len(pts)} px gris clairs ; boite {min(xs)}..{max(xs)} x {min(ys)}..{max(ys)} ({max(xs)-min(xs)+1}x{max(ys)-min(ys)+1})")
    # fond de la pastille : mediane des px gris NON-texte (les plus sombres du lot)
    v=sorted(((Y(CP[x,y]),x,y) for x,y in pts))
    fond=[CP[x,y] for _,x,y in v[:len(v)//3]]
    txt=[CP[x,y] for _,x,y in v[-len(v)//6:]]
    fm=tuple(int(statistics.median([p[k] for p in fond])) for k in range(3))
    tm=tuple(int(statistics.median([p[k] for p in txt])) for k in range(3))
    print(f"   fond de la pastille {fm} (L={Y(fm):.1f})  |  encre {tm} (L={Y(tm):.1f})")
    print(f"   la peinture juste a cote (x 300..360, meme y) : {tuple(int(statistics.median([CP[x,y][k] for y in range(min(ys),max(ys)+1) for x in range(300,360)])) for k in range(3))}")
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    rx0,ry0,rx1,ry1=int((x0-TX)/S),int((y0-TY)/S),int((x1-TX)/S),int((y1-TY)/S)
    print(f"   zone homologue REFERENCE x {rx0}..{rx1} y {ry0}..{ry1} : L med {statistics.median([Y(RP[x,y]) for y in range(ry0,ry1+1) for x in range(rx0,rx1+1)]):.1f}")
    # recouvre-t-elle un nom ou un repere peint ?
    print("   noms de la CAPTURE dans cette bande y : ", [n for n,(a,b,c,d) in
          {"LA CHANCELLERIE":(56,1934,270,2017),"LES FRICHES":(451,1953,605,1993),"PONT-GRIS":(840,1944,970,1974)}.items()
          if not (d < y0 or b > y1)])
    cap.crop((0,2050,340,2140)).resize((340*3,90*3),Image.NEAREST).save(os.path.join(D,"mesures","z_pastille_chaleur.png"))
    print("   ecrit mesures/z_pastille_chaleur.png")
