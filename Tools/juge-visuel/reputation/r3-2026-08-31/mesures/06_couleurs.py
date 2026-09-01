# -*- coding: utf-8 -*-
"""06 — COULEURS : médiane d'une fenêtre d'aplat (≥3 px de tout bord), par canal, comparée au
jeton nommé par le châssis (chassis6.py T{}). Pour les textes, on prend la médiane du décile
le plus lumineux de la boîte (le cœur du glyphe), jamais un pixel isolé.
Contrôle positif : `or_filet` #b08d3e (bord du cerne) doit sortir juste des DEUX côtés — il est
opaque, sans mélange, donc insensible à l'espace de composition.
Contrôle négatif : le fond de l'écran est un dégradé + deux radiaux ; il DOIT différer entre le
haut et le bas de la même image — un instrument qui rendrait les deux identiques ne verrait pas
les dégradés, et n'aurait donc rien à dire sur les translucidités."""
from PIL import Image
T = {'fond':'#0b1016','fond2':'#0d0f10','carte':'#111823','carte2':'#16191b','rang':'#232a2d',
     'lisere':'#2a3648','creux':'#0a0e16','creme':'#eae0c8','creme2':'#b9ad92','muet':'#8a979c',
     'eteint':'#6b737d','or':'#d9ab4e','or_vif':'#f2c96b','or_filet':'#b08d3e','or_franc':'#ffd23f',
     'cyan':'#7fd4d9','vert':'#7db36a','ambre':'#ff9e3d'}
def hx(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
def med(im,x0,y0,x1,y1,haut=None):
    px=im.load(); ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    if haut:
        ps.sort(key=lambda p:.2126*p[0]+.7152*p[1]+.0722*p[2])
        ps=ps[-max(3,len(ps)//haut):]
    return tuple(sorted(p[i] for p in ps)[len(ps)//2] for i in range(3))

REF=Image.open('/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png').convert('RGB')
CAP=Image.open('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png').convert('RGB')
print('REF m-120.png',REF.size,' CAP screen_b3_reputation_1080x1920.png',CAP.size)
# nom, jeton attendu, rect REF, rect CAP, decile? 
PTS=[
 ('cerne / bord .prt (or_filet)','or_filet',(69,1000,72,1030),(72,700,75,730),None),
 ('bord doré bas enseigne','or_filet',(300,553,400,556),(300,224,400,228),None),
 ('titre «Le miroir» (or_vif)','or_vif',(273,427,619,466),(332,81,751,126),12),
 ('CTA texte (or_vif)','or_vif',(194,1654,703,1673),(237,1727,843,1755),12),
 ('chiffres compteur 1 (cyan)','cyan',(142,603,200,635),(190,284,254,322),8),
 ('3e compteur : « — »','cyan',(698,603,760,635),(852,303,901,310),4),
 ('fond fenetre compteur (creux)','creux',(150,592,290,600),(185,272,350,282),None),
 ('bord liseré fenetre','lisere',(160,585,280,587),(200,262,340,264),None),
 ('fond .elast (fond2)','fond2',(520,1250,800,1330),(560,1150,1000,1330),None),
 ('fond tuile (carte)','carte',(760,935,820,950),(930,655,1000,680),None),
 ('fond cadre .prt (carte)','carte',(85,1100,115,1150),(85,1150,120,1300),None),
 ('fond .pann (carte)','carte',(700,1385,830,1395),(880,1415,1000,1430),None),
 ('fond .cta6 (carte2)','carte2',(100,1640,180,1690),(100,1715,200,1770),None),
 ('visage (creme2)','creme2',(250,940,290,970),(255,690,300,730),None),
 ('cou (creme2)','creme2',(240,1020,270,1045),(250,810,290,835),None),
 ('col / triangle (creme)','creme',(240,1065,255,1080),(260,860,285,880),None),
 ('buste (carte2)','carte2',(195,1120,225,1145),(215,910,250,940),None),
 ('cheveux (carte2)','carte2',(255,880,285,900),(255,610,300,630),None),
 ('gants (rang)','rang',(148,1155,168,1168),(155,940,185,960),None),
 ('«Il vous écoute» (vert)','vert',(146,1196,345,1217),(160,993,407,1018),10),
 ('libellé compteur (muet)','muet',(120,653,220,665),(150,341,270,359),8),
 ('sous-texte tuile (eteint)','eteint',(520,885,780,905),(610,592,930,614),8),
]
def d(a,b): return tuple(x-y for x,y in zip(a,b))
print('\n%-30s %-9s %-16s %-16s %-16s %s'%('point','jeton','attendu','REF','CAP','Δ(CAP-REF)'))
for nom,jet,rr,rc,h in PTS:
    a=hx(T[jet]); r=med(REF,*rr,haut=h); c=med(CAP,*rc,haut=h)
    print('%-30s %-9s %-16s %-16s %-16s %s   [Δ REF-jeton %s]'%(nom,jet,str(a),str(r),str(c),str(d(c,r)),str(d(r,a))))
print('\n-- contrôle négatif : dégradé de fond, haut vs bas de la MÊME image')
print('  REF haut',med(REF,28,390,40,470),' bas',med(REF,28,1650,40,1720))
print('  CAP haut',med(CAP,30,30,42,120),' bas',med(CAP,30,1800,42,1890))
