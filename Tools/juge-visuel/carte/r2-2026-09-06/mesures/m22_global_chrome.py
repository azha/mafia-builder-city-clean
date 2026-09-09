# m22 — COUCHE GLOBALE (palette, luminance, densite, rythme) + etat du CHROME + inventaire des ABSENCES.
# CONVENTION : la couche globale se mesure sur la zone de CONTENU seule (ref 219..2084 ; cap 232..2135),
#   jamais sur l'image entiere (le chrome n'est pas a la meme echelle, dossier).
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
def Y(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
print("\n[1] COUCHE GLOBALE sur la zone de contenu")
for tag,im,y0,y1 in (("REF",ref,219,2084),("CAP",cap,232,2135)):
    z=im.crop((0,y0,1080,y1+1))
    px=z.load(); W,H=z.size
    L=[Y(px[x,y]) for y in range(0,H,3) for x in range(0,W,3)]
    print(f"  {tag}: zone {W}x{H}  L moyenne {statistics.mean(L):6.2f}  mediane {statistics.median(L):6.2f}  "
          f"p90 {sorted(L)[int(len(L)*0.9)]:6.2f}  p99 {sorted(L)[int(len(L)*0.99)]:6.2f}")
    # densite d'encre : part de l'aire au-dessus de fond+30 L
    fond=statistics.median(L)
    print(f"      densite 'encre' (L > mediane+30 = {fond+30:.0f}) : {100*sum(1 for v in L if v>fond+30)/len(L):5.2f} %")
    print(f"      densite 'encre' (L > 110)                         : {100*sum(1 for v in L if v>110)/len(L):5.2f} %")
    print(f"      blanc pur-ish (L > 240)                           : {100*sum(1 for v in L if v>240)/len(L):5.3f} %")
    q=z.quantize(colors=6, method=Image.MEDIANCUT).convert("RGB")
    cols=sorted(q.getcolors(1<<20), reverse=True)[:6]
    tot=sum(c for c,_ in cols)
    print("      palette dominante :", ", ".join(f"{rgb} {100*c/tot:4.1f}%" for c,rgb in cols))
print("\n[2] BLANC PUR dans la CAPTURE — ou est-il ?")
w=[(x,y) for y in range(232,2136) for x in range(0,1080) if CP[x,y]==(255,255,255)]
print(f"   px exactement (255,255,255) : {len(w)}")
if w:
    xs=[p[0] for p in w]; ys=[p[1] for p in w]
    print(f"   boite : x {min(xs)}..{max(xs)} y {min(ys)}..{max(ys)}  -> unique zone ? {max(ys)-min(ys)<80}")
w2=[(x,y) for y in range(219,2085) for x in range(0,1080) if RP[x,y]==(255,255,255)]
print(f"   idem dans la REFERENCE : {len(w2)} px")
print("\n[3] CHROME de la capture (juge contre le canon du HUD, PAS contre le cadre de serie 6)")
cap.crop((0,0,1080,235)).save(os.path.join(D,"mesures","z_chrome_haut.png"))
cap.crop((0,2140,1080,2400)).save(os.path.join(D,"mesures","z_chrome_bas.png"))
# aile droite : y'a-t-il un tiret ?
z=cap.crop((900,50,1060,110)); z.resize((160*3,60*3),Image.NEAREST).save(os.path.join(D,"mesures","z_chrome_phase.png"))
print("   ecrit z_chrome_haut.png, z_chrome_bas.png, z_chrome_phase.png")
print("\n[4] ABSENCES — presence/absence des elements d'ETAT de la maquette, au meme endroit recale")
S,TX,TY=1.0220,-12.0,8.0
CIB={"ecusson 1 (QUAI-NORD)":(370,375,460,470),"ecusson 2 (HAUTES-MARCHES)":(390,555,470,650),
     "ecusson 3 (SAINT-BRAND)":(140,790,220,880),"ecusson 4 (LES ENTREPOTS)":(380,795,460,880),
     "ecusson 5 (PLACE DES COMPTES)":(370,1540,450,1630),"ecusson 6 (LES FRICHES)":(600,1690,680,1780),
     "epingle VOUS ETES ICI":(830,1500,930,1620),"disque or LA LISIERE":(790,1500,1010,1720),
     "drapeau rouge (LES BASSINS)":(240,340,290,400),
     "lavis khaki LES BASSINS":(60,360,300,520),"lavis khaki HAUTES-MARCHES":(400,560,760,760),
     "bande de legende (F6 du r1)":(40,2090,500,2136)}
print(f"   {'element':32s}{'REF L med':>10}{'REF L max':>10}{'CAP L med':>10}{'CAP L max':>10}  verdict")
for n,(x0,y0,x1,y1) in CIB.items():
    if y1>2084:
        rl=[Y(RP[x,y]) for y in range(y0,min(y1,2084)) for x in range(x0,x1,2)]
    else:
        rl=[Y(RP[x,y]) for y in range(y0,y1,2) for x in range(x0,x1,2)]
    cx0,cy0,cx1,cy1=int(S*x0+TX),int(S*y0+TY),int(S*x1+TX),int(S*y1+TY)
    cl=[Y(CP[max(0,min(1079,x)),max(232,min(2135,y))]) for y in range(cy0,cy1,2) for x in range(cx0,cx1,2)]
    v="ABSENT en jeu" if (max(rl)-statistics.median(rl) > 25 and max(cl)-statistics.median(cl) < 22) else "a examiner"
    print(f"   {n:32s}{statistics.median(rl):>10.1f}{max(rl):>10.1f}{statistics.median(cl):>10.1f}{max(cl):>10.1f}  {v}")
