# m12 — hauteur de CAPITALE (ce que l'œil voit) sur les lignes homologues.
# Méthode : dans une fenêtre, on isole le PREMIER glyphe (première composante de colonnes encrées),
# qui est une CAPITALE dans les deux images ("T"rois / "C"inq, etc.), et on mesure sa hauteur d'encre.
# Contrôle positif : sur la référence, .attendant b est en Georgia 10px -> hauteur de capitale
#   attendue ≈ 0,70*10*3,6 = 25 px. Contrôle négatif : le titre (.ligne-soir 11,5px) doit rendre
#   une valeur DIFFÉRENTE (≈29 px) — une sonde qui rend le même nombre partout ne mesure rien.
from util import *
print("== m12 hauteur de capitale ==")
def premier_glyphe(im, fen, seuil):
    px=im.load(); x0,y0,x1,y1=fen
    cols=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if (lambda c:(c[0]*299+c[1]*587+c[2]*114)/1000)(px[x,y])>seuil)
        cols.append((x,n))
    # première colonne encrée
    i=0
    while i<len(cols) and cols[i][1]==0: i+=1
    if i>=len(cols): return None
    j=i
    while j<len(cols) and cols[j][1]>0: j+=1
    xa,xb=cols[i][0],cols[j-1][0]
    ya,yb=10**9,-1
    for x in range(xa,xb+1):
        for y in range(y0,y1):
            c=px[x,y]; L=(c[0]*299+c[1]*587+c[2]*114)/1000
            if L>seuil: ya=min(ya,y); yb=max(yb,y)
    return (xa,ya,xb,yb, xb-xa+1, yb-ya+1)

cas = [
 ("RÉF titre 'Trois…'",        REF, (140,640,1080,700), 60),
 ("CAP titre 'Cinq…'",         CAP, ( 40,1285,1080,1340), 60),
 ("RÉF nom 'Lt. Kane' (file)", REF, (100,1040,320,1090), 90),
 ("CAP nom 1 (file)",          CAP, ( 30,1525,330,1570), 90),
 ("RÉF tag 'CUISINIER…'",      REF, ( 60,1090,340,1120), 60),
 ("CAP tag 'Severe · Critical'",CAP,( 60,1570,330,1605), 60),
 ("RÉF tampon 'RÉPARER…'",     REF, (180,1720,1000,1790),110),
 ("CAP CTA 'TEACH:…'",         CAP, (100,1855,1000,1920),110),
 ("RÉF filet 'Escalades'",     REF, ( 55,1955,600,2010), 60),
 ("CAP 'Escalades archivées'", CAP, (300,2020,800,2070), 60),
]
for lbl,P,fen,s in cas:
    im=Image.open(P).convert("RGB")
    g=premier_glyphe(im,fen,s)
    print(f"  {lbl:32s} fen={fen} seuil={s} -> glyphe x{g[0]}..{g[2]} y{g[1]}..{g[3]}  {g[4]}x{g[5]} px  (hauteur capitale = {g[5]} px = {g[5]/3.6:.2f} CSS)")
