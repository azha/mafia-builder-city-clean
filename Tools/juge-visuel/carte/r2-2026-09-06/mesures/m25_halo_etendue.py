# m25 — ETENDUE du halo de la CAPTURE : rayon a mi-hauteur, surface de peinture eclaircie, et ce que
#       la maquette fait au meme endroit (contour sombre). Grandeur commune : delta de luminance
#       par rapport a la peinture intacte, MESURE AUX MEMES POINTS DE LA PEINTURE (recalage m06).
# CONVENTION DE BORD : mi-alpha nominal (rayon ou le delta retombe a la moitie de son pic).
# CONTROLE POSITIF : la meme mesure sur "LE THRENNY" (peint des deux cotes) doit rendre delta ~ 0.
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
NOMS={"SAINT-BRAND":(87,931,278,986),"DEPOT-EST":(848,925,1012,987),"LE TREILLIS":(80,1394,249,1442),
      "MARNE-BASSE":(451,1413,652,1460),"LES ENTREPOTS":(460,926,684,996),"LES BASSINS":(75,462,260,535),
      "PONT-GRIS":(820,1922,990,1996),"LE VERRE":(856,1383,998,1464)}
print("\nDELTA de luminance CAPTURE - REFERENCE aux MEMES points de la peinture, par distance a l'encre du jeu")
tot_ecl=0; tot_som=0
print(f"{'nom':16s}" + "".join(f"d{d:<6d}" for d in (1,2,4,6,8,12,16,22,30,40)) + "  rayon a mi-pic")
for nom,(x0,y0,x1,y1) in NOMS.items():
    ink={(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1) if cream(CP[x,y])}
    if len(ink)<150: print(f"{nom:16s} peu d'encre ({len(ink)})"); continue
    P=40
    buck={}
    for y in range(max(232,y0-P),min(2135,y1+P)):
        for x in range(max(0,x0-P),min(1080,x1+P)):
            if (x,y) in ink: continue
            d=min(int(((x-ax)**2+(y-ay)**2)**0.5) for ax,ay in ink) if False else None
            buck=buck
    # distance par BFS (plus rapide)
    W0=max(0,x0-P); H0=max(232,y0-P); W1=min(1079,x1+P); H1=min(2135,y1+P)
    w=W1-W0+1; h=H1-H0+1
    dist=[[-1]*w for _ in range(h)]; q=[]
    for (x,y) in ink:
        if W0<=x<=W1 and H0<=y<=H1: dist[y-H0][x-W0]=0; q.append((x-W0,y-H0))
    hd=0
    while hd<len(q):
        i,j=q[hd]; hd+=1; dd=dist[j][i]
        if dd>=P: continue
        for dj in(-1,0,1):
            for di in(-1,0,1):
                ni,nj=i+di,j+dj
                if 0<=ni<w and 0<=nj<h and dist[nj][ni]<0: dist[nj][ni]=dd+1; q.append((ni,nj))
    B={}
    for j in range(h):
        for i in range(w):
            dd=dist[j][i]
            if dd<=0: continue
            cx,cy=W0+i,H0+j
            rx=(cx-TX)/S; ry=(cy-TY)/S
            if not (0<=rx<1079 and 219<=ry<2084): continue
            # bilineaire sur la reference
            ix,iy=int(rx),int(ry); fx,fy=rx-ix,ry-iy
            va=Y(RP[ix,iy])*(1-fx)+Y(RP[ix+1,iy])*fx
            vb=Y(RP[ix,iy+1])*(1-fx)+Y(RP[ix+1,iy+1])*fx
            vr=va*(1-fy)+vb*fy
            if cream(RP[ix,iy]): continue      # ecarte l'encre de la maquette
            B.setdefault(dd,[]).append(Y(CP[cx,cy])-vr)
    med={d:statistics.median(v) for d,v in B.items() if len(v)>=20}
    if not med: continue
    pic=max(med.values()); mi=pic/2
    ray=max([d for d in sorted(med) if med[d]>=mi] or [0])
    ecl=sum(len([v for v in B[d] if v>5]) for d in B)
    som=sum(len([v for v in B[d] if v<-5]) for d in B)
    tot_ecl+=ecl; tot_som+=som
    print(f"{nom:16s}" + "".join(f"{med.get(d,float('nan')):<7.1f}" for d in (1,2,4,6,8,12,16,22,30,40)) + f"  pic {pic:5.1f} L, mi-pic a d={ray}  |  px eclaircis>5L : {ecl}, assombris<-5L : {som}")
print(f"\nTOTAL sur ces 8 noms : {tot_ecl} px de peinture ECLAIRCIS de plus de 5 L, {tot_som} px ASSOMBRIS")
print("\nCTRL+ 'LE THRENNY' (peint dans la texture des deux cotes) : delta attendu ~ 0")
ink={(x,y) for y in range(1155,1190) for x in range(413,659) if Y(CP[x,y])>120 and (CP[x,y][2]-CP[x,y][0])>20}
ds=[]
for y in range(1130,1215):
    for x in range(390,690):
        if (x,y) in ink: continue
        rx=(x-TX)/S; ry=(y-TY)/S
        ix,iy=int(rx),int(ry); fx,fy=rx-ix,ry-iy
        va=Y(RP[ix,iy])*(1-fx)+Y(RP[ix+1,iy])*fx; vb=Y(RP[ix,iy+1])*(1-fx)+Y(RP[ix+1,iy+1])*fx
        ds.append(Y(CP[x,y])-(va*(1-fy)+vb*fy))
ds.sort()
print(f"   n={len(ds)}  delta median {statistics.median(ds):+.2f} L  p05 {ds[int(len(ds)*.05)]:+.2f}  p95 {ds[int(len(ds)*.95)]:+.2f}")
cap.crop((80,1385,260,1455)).resize((180*4,70*4),Image.NEAREST).save(os.path.join(D,"mesures","z_halo_LETREILLIS_cap.png"))
ref.crop((int((80-TX)/S),int((1385-TY)/S),int((260-TX)/S),int((1455-TY)/S))).resize((180*4,70*4),Image.NEAREST).save(os.path.join(D,"mesures","z_halo_LETREILLIS_ref.png"))
print("   ecrit z_halo_LETREILLIS_{cap,ref}.png")
