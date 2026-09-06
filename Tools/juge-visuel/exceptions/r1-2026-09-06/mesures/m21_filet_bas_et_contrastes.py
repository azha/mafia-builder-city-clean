# m21 — bas du filet (réf) + CONTRASTES des textes (doctrine : ≥3:1 grands, ≥4,5:1 petits).
from util import *
print("== m21 filet (bas) + contrastes ==")
ref=ouvrir(REF); pr=ref.load()
col=[(y,pr[540,y]) for y in range(2000,2090)]
bord=[t for t in col if abs(t[1][0]-48)<=12 and abs(t[1][1]-53)<=12 and abs(t[1][2]-60)<=12]
print(f"  RÉF filet : liseré bas trouvé aux y {[t[0] for t in bord]}")
print(f"  RÉF filet hauteur = {bord[-1][0]-1919+1} px = {(bord[-1][0]-1919+1)/3.6:.1f} CSS  (largeur 1003 px = 278,6 CSS)")

cap=ouvrir(CAP)
print("\n  -- contrastes (couleur d'encre médiane dans un fût, contre le fond médian) --")
cas=[
 ("CAP titre 'Cinq attendent…'",      CAP,(78,1305),(540,1270),"grand"),
 ("CAP nom 'Votre lieutenant' (1)",   CAP,(60,1548),(400,1548),"grand"),
 ("CAP tag 'Severe · Critical'",      CAP,(101,1587),(300,1587),"petit"),
 ("CAP méta bulle 'Votre lieutenant'",CAP,(310,1677),(900,1677),"petit"),
 ("CAP slug 'exc_demo_teach_heat'",   CAP,(316,1729),(950,1729),"grand"),
 ("CAP CTA 'TEACH…'",                 CAP,(120,1888),(700,1845),"grand"),
 ("CAP CTA sous-titre",               CAP,(430,1930),(700,1930),"petit"),
 ("CAP 'Escalades archivées'",        CAP,(375,2045),(120,2045),"grand"),
 ("CAP 'à relire à tête reposée'",    CAP,(420,2088),(120,2088),"petit"),
 ("RÉF titre 'Trois attendent…'",     REF,(172,678),(540,620),"grand"),
 ("RÉF nom 'Lt. Kane'",               REF,(150,1063),(340,1063),"grand"),
 ("RÉF tampon 'RÉPARER…'",            REF,(220,1760),(700,1710),"grand"),
]
for lbl,P,(ex,ey),(fx,fy),taille in cas:
    im=Image.open(P).convert("RGB")
    e=mediane_fenetre(im,ex,ey,1); f=mediane_fenetre(im,fx,fy,5)
    r=contraste(e,f); seuil=3.0 if taille=="grand" else 4.5
    print(f"   {lbl:36s} encre={e} fond={f} -> {r:5.2f}:1  seuil {seuil} -> {'OK' if r>=seuil else 'SOUS LE SEUIL'}")
