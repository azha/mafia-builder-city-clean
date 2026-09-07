# -*- coding: utf-8 -*-
"""CHROME v2 — sondes RESCOPEES. La v1 (`27_`) donnait des resultats ABSURDES sur le canon
(medaillon 'diametre 1176', dock trouve a 0,750 de la hauteur) parce que le canon est l'ECRAN HUD
ENTIER (carte comprise), pas le seul chrome : ses sondes balayaient l'art. Resultats v1 conserves
uniquement pour la hauteur de bandeau et le centrage, qui eux etaient bornes.
Repere : canon 1176 px = 392 CSS (x3) ; capture 1080 px = 392 CSS (x2,755) ; facteur 0,91837.
CONTROLE POSITIF : hauteur de bandeau canon 153 -> attendu 140,5, mesure 141 (ecart +0,3 %).
CONTROLE NEGATIF : une sonde lancee sur une bande d'art du canon (y 800..900) doit rendre des
                   resultats NON uniformes et etre ecartee -> on borne toutes les fenetres."""
from PIL import Image
K=1080/1176.0
def m(v): v=sorted(v); return v[len(v)//2]
def hx(c): return "#%02x%02x%02x"%c
CAN="../hud-canon-1176.png"; CAP="../capture-1080x2400.png"
ic=Image.open(CAN).convert("RGB"); Wc,Hc=ic.size; pc=ic.load()
ia=Image.open(CAP).convert("RGB"); Wa,Ha=ia.size; pa=ia.load()
print("OUVERT %s %dx%d | %s %dx%d | facteur = %.5f\n"%(CAN,Wc,Hc,CAP,Wa,Ha,K))

print("--- MEDAILLON : traversee horizontale a la hauteur du centre ---")
def traverse(px,W,y,pred,gapmax=4):
    on=[x for x in range(W) if pred(px[x,y])]
    g=[];s=None;p=None
    for x in on:
        if s is None: s=x
        elif x-p>gapmax: g.append((s,p)); s=x
        p=x
    if s is not None: g.append((s,p))
    return g
laiton=lambda p: abs(p[0]-190)<70 and abs(p[1]-152)<60 and abs(p[2]-70)<60 and p[0]-p[2]>70
braise=lambda p: abs(p[0]-224)<50 and abs(p[1]-102)<45 and abs(p[2]-74)<45
for nom,px,W,pred,ys in (("canon  ",pc,Wc,laiton,(100,110,120)),("capture",pa,Wa,braise,(100,110,120))):
    for y in ys:
        g=[t for t in traverse(px,W,y,pred) if 300<t[0]<900]
        if len(g)==2:
            d=g[1][1]-g[0][0]+1
            print("  %s y=%3d : anneau %s  diametre exterieur = %d px%s"%(nom,y,g,d,
                  "" if nom=="canon  " else "  (attendu depuis le canon : voir ci-dessous)"))
gc=[t for t in traverse(pc,Wc,110,laiton) if 300<t[0]<900]
ga=[t for t in traverse(pa,Wa,110,braise) if 300<t[0]<900]
dc=gc[1][1]-gc[0][0]+1; da=ga[1][1]-ga[0][0]+1
print("  => canon %d px -> attendu %.1f ; capture %d  (ecart %+.1f px = %+.1f %%)"%(dc,dc*K,da,da-dc*K,100*(da-dc*K)/(dc*K)))
ec=gc[0][1]-gc[0][0]+1; ea=ga[0][1]-ga[0][0]+1
print("  epaisseur de l'anneau : canon %d -> attendu %.1f ; capture %d"%(ec,ec*K,ea))
# debordement sous le filet
print("  bas de l'anneau : canon y=%s ; capture y=%s"%(
  max(y for y in range(0,300) if [t for t in traverse(pc,Wc,y,laiton) if 300<t[0]<900]),
  max(y for y in range(0,300) if [t for t in traverse(pa,Wa,y,braise) if 300<t[0]<900])))

print("\n--- AILE GAUCHE : libelle ARGENT, valeur, jauge ---")
def bbox(px,W,x0,x1,y0,y1,pred):
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if pred(px[x,y])]
    if not pts: return None
    return min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts),len(pts)
clair=lambda p: p[0]>110 and p[1]>105 and p[2]>95
or_=lambda p: p[0]>150 and 110<p[1]<215 and p[2]<135 and p[0]-p[2]>70 and p[1]-p[2]>25
print("  canon   libelle ARGENT (clair, y20..48)  :",bbox(pc,Wc,0,600,20,50,clair))
print("  capture libelle ARGENT (clair, y18..44)  :",bbox(pa,Wa,0,600,18,46,clair))
print("  canon   valeur or (y55..115)             :",bbox(pc,Wc,0,600,55,118,or_))
print("  capture valeur or (y45..105)             :",bbox(pa,Wa,0,600,45,108,or_))
print("  canon   jauge or  (y120..136)            :",bbox(pc,Wc,0,600,120,137,or_))
print("  capture jauge or  (y108..126)            :",bbox(pa,Wa,0,600,108,127,or_))
gris=lambda p: 60<p[0]<135 and 70<p[1]<145 and 95<p[2]<180 and p[2]-p[0]>20
print("  canon   reliquat gris de la jauge        :",bbox(pc,Wc,0,600,120,137,gris))
print("  capture reliquat gris de la jauge        :",bbox(pa,Wa,0,600,108,127,gris))

print("\n--- COIN GAUCHE (fleche retour ?) ---")
print("  canon   x 0..150 y 20..130, encre claire :",bbox(pc,Wc,0,150,20,130,clair))
print("  capture x 0..150 y 20..130, encre claire :",bbox(pa,Wa,0,150,20,130,clair))

print("\n--- DOCK (fenetre bornee au bas de chaque image) ---")
def dock(px,W,H,y0,fond):
    prem=None
    for y in range(y0,H):
        c=sum(1 for x in range(0,W,2) if max(abs(px[x,y][i]-fond[i]) for i in range(3))>22)
        if c>60: prem=y; break
    if prem is None: return None,None
    ym=prem+int(60*(W/1080.0))
    cols=[x for x in range(W) if max(abs(px[x,ym][i]-fond[i]) for i in range(3))>22]
    g=[];s=None;p=None
    for x in cols:
        if s is None: s=x
        elif x-p>14: g.append((s,p)); s=x
        p=x
    if s is not None: g.append((s,p))
    return prem,[t for t in g if t[1]-t[0]>40]
pcd=dock(pc,Wc,Hc,1830,(30,36,52)); pad=dock(pa,Wa,Ha,2100,(13,13,13))
print("  canon   : 1re ligne y=%s ; ronds %s"%(pcd[0],pcd[1]))
print("  capture : 1re ligne y=%s ; ronds %s"%(pad[0],pad[1]))
if pcd[1] and pad[1] and len(pcd[1])>=2 and len(pad[1])>=2:
    dn=pcd[1][0][1]-pcd[1][0][0]+1; dax=pad[1][0][1]-pad[1][0][0]+1
    en=pcd[1][1][0]-pcd[1][0][0]; ea2=pad[1][1][0]-pad[1][0][0]
    print("  diametre du 1er rond : canon %d -> attendu %.1f ; capture %d  (ecart %+.1f %%)"%(dn,dn*K,dax,100*(dax-dn*K)/(dn*K)))
    print("  entraxe              : canon %d -> attendu %.1f ; capture %d  (ecart %+.1f %%)"%(en,en*K,ea2,100*(ea2-en*K)/(en*K)))
    print("  1er rond, bord gauche: canon %d -> attendu %.1f ; capture %d"%(pcd[1][0][0],pcd[1][0][0]*K,pad[1][0][0]))
