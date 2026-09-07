# -*- coding: utf-8 -*-
"""CHROME v3 — fenetres bornees en X aussi (v2 laissait la sonde 'or' entrer dans le medaillon
et la sonde 'anneau' attraper les pastilles doreesc des coins ; v2 donnait 'bas de l'anneau y=299'
et une jauge allant jusqu'a x=545, deux valeurs contaminees par le voisin).
CONTROLE POSITIF : hauteur de bandeau canon 153 -> attendu 140,5 px, mesure 141 (+0,3 %).
CONTROLE NEGATIF : la sonde 'or' bornee a x<440 ne doit RIEN trouver dans le disque du medaillon."""
from PIL import Image
K=1080/1176.0
def hx(c): return "#%02x%02x%02x"%c
CAN="../hud-canon-1176.png"; CAP="../capture-1080x2400.png"
ic=Image.open(CAN).convert("RGB"); Wc,Hc=ic.size; pc=ic.load()
ia=Image.open(CAP).convert("RGB"); Wa,Ha=ia.size; pa=ia.load()
print("OUVERT %s %dx%d | %s %dx%d | facteur canon->capture = %.5f\n"%(CAN,Wc,Hc,CAP,Wa,Ha,K))
def bbox(px,x0,x1,y0,y1,pred):
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if pred(px[x,y])]
    if not pts: return None
    return (min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts),len(pts))
clair=lambda p: p[0]>110 and p[1]>105 and p[2]>95
or_=lambda p: p[0]>150 and 110<p[1]<215 and p[2]<135 and p[0]-p[2]>70 and p[1]-p[2]>25
gris=lambda p: 60<p[0]<135 and 70<p[1]<145 and 95<p[2]<180 and p[2]-p[0]>20
laiton=lambda p: abs(p[0]-190)<70 and abs(p[1]-152)<60 and abs(p[2]-70)<60 and p[0]-p[2]>70
braise=lambda p: abs(p[0]-224)<50 and abs(p[1]-102)<45 and abs(p[2]-74)<45

print("--- 1. MEDAILLON, borne a la colonne centrale ---")
bc=bbox(pc,440,740,0,320,laiton); ba=bbox(pa,420,680,0,320,braise)
print("  canon   anneau : x %d..%d  y %d..%d  (%d px)"%bc)
print("  capture anneau : x %d..%d  y %d..%d  (%d px)"%ba)
print("  diametre : canon %d -> attendu %.1f ; capture %d  (%+.1f %%)"%(bc[1]-bc[0]+1,(bc[1]-bc[0]+1)*K,ba[1]-ba[0]+1,100*((ba[1]-ba[0]+1)-(bc[1]-bc[0]+1)*K)/((bc[1]-bc[0]+1)*K)))
print("  debordement sous le filet : canon bas %d - filet 155 = %d px -> attendu %.1f ; capture bas %d - filet 142 = %d px"
      %(bc[3],bc[3]-155,(bc[3]-155)*K,ba[3],ba[3]-142))

print("\n--- 2. AILE GAUCHE, bornee a x<440 ---")
for nom,px,y1,y2,y3 in (("canon  ",pc,(20,52),(55,118),(119,140)),("capture",pa,(16,48),(50,106),(107,130))):
    l=bbox(px,0,440,y1[0],y1[1],clair); v=bbox(px,0,440,y2[0],y2[1],or_)
    j=bbox(px,0,440,y3[0],y3[1],or_); g=bbox(px,0,440,y3[0],y3[1],gris)
    print("  %s libelle %s | valeur %s"%(nom,l[:4] if l else None,v[:4] if v else None))
    print("          jauge or %s | reliquat gris %s"%(j[:4] if j else None,g[:4] if g else None))
lc=bbox(pc,0,440,20,52,clair); la=bbox(pa,0,440,16,48,clair)
print("  bord gauche du bloc ARGENT : canon x=%d -> attendu %.1f ; capture x=%d  (ecart %+.1f px = %+.1f %% de la largeur)"
      %(lc[0],lc[0]*K,la[0],la[0]-lc[0]*K,100*(la[0]-lc[0]*K)/1080))
jc=bbox(pc,0,440,119,140,or_); gc=bbox(pc,0,440,119,140,gris)
ja=bbox(pa,0,440,107,130,or_); ga=bbox(pa,0,440,107,130,gris)
print("  jauge : canon or %d..%d + gris %d..%d ⇒ piste totale %d..%d, remplissage %.0f %%"
      %(jc[0],jc[1],gc[0],gc[1],min(jc[0],gc[0]),max(jc[1],gc[1]),100*(jc[1]-jc[0]+1)/(max(jc[1],gc[1])-min(jc[0],gc[0])+1)))
print("  jauge : capture or %d..%d + gris %s ⇒ %s"%(ja[0],ja[1],ga[:4] if ga else "AUCUN",
      "pas de piste : le remplissage n'est plus lisible comme une fraction" if not ga else "piste presente"))
print("  CONTROLE NEGATIF (sonde 'or' bornee x<440 dans la bande du medaillon y150..200) :",
      bbox(pa,0,440,150,200,or_) or "rien -> la sonde n'entre pas dans le medaillon")

print("\n--- 3. AILE DROITE ---")
def lignes(px,x0,x1,y0,y1,pred):
    out=[];s=None
    for y in range(y0,y1):
        c=sum(1 for x in range(x0,x1) if pred(px[x,y]))
        if c>0 and s is None: s=y
        elif c==0 and s is not None: out.append((s,y-1)); s=None
    if s is not None: out.append((s,y1))
    res=[]
    for a,b in out:
        xs=[x for y in range(a,b+1) for x in range(x0,x1) if pred(px[x,y])]
        if len(xs)>10: res.append((a,b,min(xs),max(xs)))
    return res
print("  canon   x 700..1176 :",lignes(pc,700,1176,10,150,clair))
print("  capture x 650..1080 :",lignes(pa,650,1080,10,140,clair))

print("\n--- 4. COIN GAUCHE : ce que la capture ajoute ---")
print("  canon   x 0..170 y 20..135 :",bbox(pc,0,170,20,135,clair))
print("  capture x 0..170 y 20..135 :",bbox(pa,0,170,20,135,clair))
print("  (le bloc ARGENT du canon commence a x=%d ; celui de la capture a x=%d)"%(lc[0],la[0]))
