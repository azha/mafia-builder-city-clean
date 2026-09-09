import sys; sys.path.insert(0,'.')
from lib import *
print("=== m27 : aplats, palette, contrastes (controle positif) ===")
ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
pr,pc=px(ref),px(cap)
# (nom, fenetre REF, fenetre JEU) — fenetres a >=6 px de tout bord
APLATS=[
 ('fond du cadre (gouttiere gauche)', (30,1000,44,1060), (26,1030,40,1090)),
 ('panneau .elast',                   (520,1470,560,1520),(516,1490,556,1540)),
 ('boite de compteur',                (100,715,140,745), (100,742,140,772)),
 ('carte portrait (fond)',            (100,930,140,970), (96,958,136,998)),
 ('panneau bas',                      (700,1690,760,1712),(700,1732,760,1754)),
 ('boite CTA',                        (100,1965,160,1985),(96,2000,156,2020)),
 ('enseigne (fond)',                  (100,490,160,505), (96,522,156,537)),
 ('tuile OFF (fond)',                 (900,1130,960,1160),(900,1120,960,1150)),
 ('torse',                            (180,1450,220,1490),(176,1330,216,1360)),
 ('peau du visage',                   (250,1160,280,1190),(246,1200,276,1230)),
]
print(f"  {'aplat':36s} {'REF':>16s} {'JEU':>16s}   ecart max par canal")
mx=0
for nom,(a,b,c,d),(e,f2,g,h) in APLATS:
    A=mediane_fenetre(pr,a,b,c,d); B=mediane_fenetre(pc,e,f2,g,h)
    dd=max(abs(A[i]-B[i]) for i in range(3)); mx=max(mx,dd)
    print(f"  {nom:36s} {str(A):>16s} {str(B):>16s}   {dd}")
print(f"  --> ecart maximal sur les 10 aplats : {mx}/255")
print()
print("=== jetons d'encre ===")
ENCRES=[
 ('or du titre « Le miroir »', (400,520,430,540),(404,552,434,572)),
 ('cyan des chiffres',         (176,735,186,752),(178,760,188,777)),
 ('creme du col',              (285,1300,300,1315),(282,1330,297,1345)),
 ('vert « Il vous ecoute »',   (196,1440,206,1452),(192,1468,202,1480)),
 ('filet or du cadre (gauche)',(21,1200,24,1260),(18,1200,21,1260)),
 ('filet or sous l enseigne',  (500,664,560,668),(500,688,560,692)),
]
for nom,(a,b,c,d),(e,f2,g,h) in ENCRES:
    A=mediane_fenetre(pr,a,b,c,d); B=mediane_fenetre(pc,e,f2,g,h)
    print(f"  {nom:28s} REF {str(A):>16s}  JEU {str(B):>16s}  ecart max {max(abs(A[i]-B[i]) for i in range(3))}")
print()
print("=== palette globale de la zone de contenu (cadre entier), 8 premieres couleurs ===")
for nom,im,(x0,y0,x1,y1) in [('REF',ref,(21,452,1059,2079)),('JEU',cap,(18,482,1062,2110))]:
    q=im.crop((x0,y0,x1,y1)).quantize(colors=12).convert('RGB')
    cs=sorted(q.getcolors(1000000),reverse=True)[:8]; tot=sum(n for n,_ in q.getcolors(1000000))
    print(f"  {nom}: " + "  ".join(f"{c} {100*n/tot:.2f}%" for n,c in cs))
print()
print("=== luminance moyenne et densite d'encre du cadre ===")
for nom,im,(x0,y0,x1,y1) in [('REF',ref,(21,452,1059,2079)),('JEU',cap,(18,482,1062,2110))]:
    p=px(im); tot=0;n=0;enc=0
    for y in range(y0,y1,2):
        for x in range(x0,x1,2):
            l=lum(p[x,y]); tot+=l; n+=1
            if l>60: enc+=1
    print(f"  {nom}: luminance moyenne = {tot/n:.2f} ; densite d'encre (L>60) = {100*enc/n:.2f} %")
