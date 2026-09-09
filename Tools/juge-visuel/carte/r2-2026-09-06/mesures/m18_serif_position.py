# m18 — (A) SIGNATURE SERIF/SANS mesurable, (B) POSITION des noms (F8 du r1, a remesurer),
#       (C) DECOMPOSITION largeur = chasse des glyphes vs interlettrage.
# (A) Signature : profil de COUVERTURE d'encre par rang, rapporte a la hauteur de capitale.
#     Une romaine a serifs empatte ses fûts en haut et en bas => bosses aux deux extremites ;
#     une lineale a une couverture ~plate. Grandeur = couverture(bande basse 0..15 %) / couverture(bande mediane 40..60 %).
#     Mesure sur les mots ~horizontaux (LE TREILLIS, MARNE-BASSE, ORSEL) pour que les rangs soient alignes.
#     CONTROLE POSITIF : "LE THRENNY" (meme glyphes des deux cotes, peint dans la texture) doit rendre le MEME rapport.
# (B) Position : centroide d'encre de la capture ramene dans le repere REFERENCE par le recalage m06.
# CONVENTION : dy > 0 = le nom du jeu est PLUS BAS que celui de la maquette.
from PIL import Image
import os, statistics, json, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); M=os.path.join(D,"mesures")
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
def ink(px,box,f):
    x0,y0,x1,y1=box
    return [(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1) if f(px[x,y])]

print("\n(A) SIGNATURE SERIF/SANS — couverture d'encre par rang (mots ~horizontaux)")
CASA=[("LE TREILLIS",(80,1394,249,1442)),("MARNE-BASSE",(451,1413,652,1460)),("ORSEL",(98,1672,206,1720))]
def signature(px,box,f):
    ps=ink(px,box,f)
    if len(ps)<150: return None
    ys=[y for _,y in ps]
    # bornes de capitale : 5e et 95e centiles pour ignorer accents isoles
    ys.sort(); y0=ys[int(len(ys)*0.02)]; y1=ys[int(len(ys)*0.99)]
    h=y1-y0+1
    if h<10: return None
    rows={}
    for _,y in ps: rows[y]=rows.get(y,0)+1
    def band(a,b):
        s=0;n=0
        for y in range(y0+int(h*a), y0+max(y0+1,int(h*b))+1 if False else y0+int(h*b)+1):
            s+=rows.get(y,0); n+=1
        return s/max(1,n)
    bas=band(0.82,0.99); mil=band(0.38,0.62); haut=band(0.01,0.18)
    return {"h":h,"bas":round(bas,1),"mil":round(mil,1),"haut":round(haut,1),
            "bas/mil":round(bas/mil,3) if mil else None,"haut/mil":round(haut/mil,3) if mil else None,"n":len(ps)}
for nom,cb in CASA:
    rb=(int((cb[0]-TX)/S),int((cb[1]-TY)/S),int((cb[2]-TX)/S),int((cb[3]-TY)/S))
    a=signature(RP,rb,cream); b=signature(CP,cb,cream)
    if not a or not b: print(f"  {nom}: IMPOSSIBLE"); continue
    print(f"  {nom:14s} REF h={a['h']:3d} bas={a['bas']:5.1f} mil={a['mil']:5.1f} haut={a['haut']:5.1f}  bas/mil={a['bas/mil']:.3f} haut/mil={a['haut/mil']:.3f}")
    print(f"  {'':14s} CAP h={b['h']:3d} bas={b['bas']:5.1f} mil={b['mil']:5.1f} haut={b['haut']:5.1f}  bas/mil={b['bas/mil']:.3f} haut/mil={b['haut/mil']:.3f}")
print("  CTRL+ 'LE THRENNY' (memes glyphes des deux cotes) :")
a=signature(RP,(415,1122,660,1155),cold); b=signature(CP,(413,1155,658,1189),cold)
print(f"    REF h={a['h']} bas/mil={a['bas/mil']:.3f} haut/mil={a['haut/mil']:.3f} | CAP h={b['h']} bas/mil={b['bas/mil']:.3f} haut/mil={b['haut/mil']:.3f}")

print("\n(B) POSITION — centroide d'encre, capture ramenee dans le repere REFERENCE")
CASB=[("LES BASSINS",(75,462,260,535)),("QUAI-NORD",(466,461,634,532)),("SARNES",(861,447,985,510)),
 ("LA COLONNE",(88,686,272,753)),("VERRIER",(866,655,1007,724)),("SAINT-BRAND",(87,931,278,986)),
 ("LES ENTREPOTS",(460,926,684,996)),("DEPOT-EST",(848,925,1012,987)),("LE TREILLIS",(80,1394,249,1442)),
 ("MARNE-BASSE",(451,1413,652,1460)),("LE VERRE",(856,1383,998,1464)),("ORSEL",(98,1672,206,1720)),
 ("LES FRICHES",(436,1937,620,2009))]
dxs=[];dys=[]
print(f"  {'nom':16s}{'ref cx,cy':>18}{'cap->ref cx,cy':>20}{'dx':>8}{'dy':>8}")
for nom,cb in CASB:
    rb=(int((cb[0]-TX)/S)-6,int((cb[1]-TY)/S)-6,int((cb[2]-TX)/S)+6,int((cb[3]-TY)/S)+6)
    pr=ink(RP,rb,cream); pc=ink(CP,cb,cream)
    if len(pr)<150 or len(pc)<150: print(f"  {nom:16s} IMPOSSIBLE ({len(pr)}/{len(pc)})"); continue
    rcx=statistics.mean(p[0] for p in pr); rcy=statistics.mean(p[1] for p in pr)
    ccx=(statistics.mean(p[0] for p in pc)-TX)/S; ccy=(statistics.mean(p[1] for p in pc)-TY)/S
    dxs.append(ccx-rcx); dys.append(ccy-rcy)
    print(f"  {nom:16s}{rcx:9.1f},{rcy:7.1f}{ccx:12.1f},{ccy:7.1f}{ccx-rcx:>+8.1f}{ccy-rcy:>+8.1f}")
print(f"  => dx med {statistics.median(dxs):+.1f} px (etendue {min(dxs):+.1f}..{max(dxs):+.1f}) | dy med {statistics.median(dys):+.1f} px (etendue {min(dys):+.1f}..{max(dys):+.1f})")
print(f"     tolerance du mandat : 2 px, ou 1,5 % du parent (1080 px) = 16 px")

print("\n(C) DECOMPOSITION de la largeur : avance par caractere = largeur d'encre / (nb de caracteres - 1)")
NC={"LES BASSINS":11,"QUAI-NORD":9,"SARNES":6,"LA COLONNE":10,"VERRIER":7,"SAINT-BRAND":11,
    "DEPOT-EST":9,"MARNE-BASSE":11,"LE VERRE":8,"ORSEL":5,"LES FRICHES":11}
LARG={"LES BASSINS":(198,156),"QUAI-NORD":(176,139),"SARNES":(116,95),"LA COLONNE":(199,156),
      "VERRIER":(135,103),"SAINT-BRAND":(214,163),"DEPOT-EST":(169,135),"MARNE-BASSE":(223,172),
      "LE VERRE":(146,113),"ORSEL":(95,79),"LES FRICHES":(199,155)}
print(f"  {'nom':14s}{'car':>4}{'REF larg':>9}{'CAP larg':>9}{'avance REF':>11}{'avance CAP':>11}{'delta':>8}")
ds=[]
for n,(lr,lc) in LARG.items():
    k=NC[n]-1
    ar=lr/k; ac=lc/k; ds.append(ar-ac)
    print(f"  {n:14s}{NC[n]:>4}{lr:>9}{lc:>9}{ar:>11.2f}{ac:>11.2f}{ar-ac:>8.2f}")
print(f"  => avance REF - avance CAP : med {statistics.median(ds):.2f} px/caractere")
print(f"     source : .carte .nomq letter-spacing:.24em a font-size 6,6 => 1,584 unite SVG")
print(f"     1 unite SVG = {3.6:.1f} px de rendu (echelle du dossier, slice a facteur 1) => interlettrage attendu {1.584*3.6:.2f} px")
