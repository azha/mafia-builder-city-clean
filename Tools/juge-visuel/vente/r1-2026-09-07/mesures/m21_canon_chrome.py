# m21 — LE CANON HUD est arrive dans le dossier PENDANT le travail : je le mesure et je corrige
# ce que j'avais ecrit sur le chrome (m8 / non-verifie n°4).
# Canon : 1176 px = 392 CSS-HUD => x3,000.  Capture : 1080 px = 392 CSS-HUD => x2,755.
# Toute comparaison se fait en CSS-HUD, jamais en px bruts.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def relL(p):
    def f(c):
        c/=255.0
        return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def contraste(a,b):
    la,lb=relL(a),relL(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)

can=Image.open(os.path.join(D,'hud-canon-1176.png')).convert('RGB'); pc=can.load()
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); pk=cap.load()
print('OUVERT canon', can.size, ' capture', cap.size)
print('CONTROLE POSITIF largeur canon = 1176 (392 CSS x3) :', can.size[0]==1176)
print()
# 1) hauteur du bandeau du canon : ou est le filet ?
print('CANON : filet du bandeau (lignes ou >60%% des colonnes depassent le fond) :')
for y in range(140,175):
    c=sum(1 for x in range(0,1176,4) if lum(pc[x,y])>lum(pc[3,y])+18)
    if c>170: print('   y=%d : %d/294 colonnes  rgb(x=200)=%s'%(y,c,pc[200,y]))
print('   -> en CSS-HUD : %.1f'%(157/3.0))
print('CAPTURE : filet mesure a y=141..142 => %.1f CSS-HUD'%(142/2.755))
print()
# 2) l'ornement a volute : existe-t-il DANS LE CANON ?
print('CANON : encre sombre du coin haut-gauche (x0..120, y50..95, lum<70) :')
fondc=pc[3,70]
xs=[(x,y) for y in range(50,100) for x in range(0,130) if lum(pc[x,y])-lum(fondc)>4 and lum(pc[x,y])<80]
if xs:
    cols=[pc[x,y] for x,y in xs]; cols.sort(key=lum); hi=cols[int(len(cols)*0.92)]
    print('   bbox x=%d..%d y=%d..%d (%dx%d px = %.1fx%.1f CSS-HUD)  n=%d  couleur_p92=%s  fond=%s  contraste=%.2f:1'%(
      min(p[0] for p in xs),max(p[0] for p in xs),min(p[1] for p in xs),max(p[1] for p in xs),
      max(p[0] for p in xs)-min(p[0] for p in xs)+1,max(p[1] for p in xs)-min(p[1] for p in xs)+1,
      (max(p[0] for p in xs)-min(p[0] for p in xs)+1)/3.0,(max(p[1] for p in xs)-min(p[1] for p in xs)+1)/3.0,
      len(xs),hi,fondc,contraste(hi,fondc)))
else: print('   AUCUNE encre sombre -> l ornement n existe PAS dans le canon')
print()
print('CAPTURE (rappel m20) : volute x=12..92 y=56..74 = 29,4 x 6,9 CSS-HUD, (65,67,68), 1,89:1')
print()
# 3) une fleche retour dans le canon ?
print('CANON : encre CLAIRE (lum>140) dans x0..200 y40..100 (une fleche « <- » serait la) :')
cl=[(x,y) for y in range(40,100) for x in range(0,200) if lum(pc[x,y])>140]
print('   n=%d px'%len(cl), ('bbox x=%d..%d y=%d..%d'%(min(p[0] for p in cl),max(p[0] for p in cl),min(p[1] for p in cl),max(p[1] for p in cl))) if cl else '(aucune)')
print('   -> le canon ne pose donc AUCUNE fleche retour dans l aile gauche.' if not cl else '')

# -- suite : aile DROITE, canon contre capture (en CSS-HUD)
print()
print('== AILE DROITE ==')
def bbox(px,x0,x1,y0,y1,seuil):
    xs=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>seuil]
    return (min(p[0] for p in xs),min(p[1] for p in xs),max(p[0] for p in xs),max(p[1] for p in xs),len(xs)) if xs else None
b=bbox(pc,700,1176,20,150,90)
print('CANON  aile droite (encre lum>90, x700..1176, y20..150) : bbox=%s'%(b,))
print('   -> deux lignes attendues : « JOUR 12 · SOIREE » puis « 21:40 »')
for y in range(20,150):
    c=sum(1 for x in range(700,1176) if lum(pc[x,y])>90)
    if c>0 and (y==20 or sum(1 for x in range(700,1176) if lum(pc[x,y-1])>90)==0): print('     debut de ligne d encre a y=%d'%y)
    if c>0 and (y==149 or sum(1 for x in range(700,1176) if lum(pc[x,y+1])>90)==0): print('     fin   de ligne d encre a y=%d'%y)
b2=bbox(pk,700,1080,15,140,60)
print('CAPTURE aile droite (encre lum>60, x700..1080, y15..140) : bbox=%s'%(b2,))
for y in range(15,140):
    c=sum(1 for x in range(700,1080) if lum(pk[x,y])>60)
    if c>0 and (y==15 or sum(1 for x in range(700,1080) if lum(pk[x,y-1])>60)==0): print('     debut de ligne d encre a y=%d'%y)
    if c>0 and (y==139 or sum(1 for x in range(700,1080) if lum(pk[x,y+1])>60)==0): print('     fin   de ligne d encre a y=%d'%y)
print()
print('CONTROLE NEGATIF : la meme sonde sur l aile GAUCHE de la capture doit trouver DEUX lignes')
for y in range(15,140):
    c=sum(1 for x in range(100,400) if lum(pk[x,y])>60)
    if c>0 and (y==15 or sum(1 for x in range(100,400) if lum(pk[x,y-1])>60)==0): print('     debut y=%d'%y)
    if c>0 and (y==139 or sum(1 for x in range(100,400) if lum(pk[x,y+1])>60)==0): print('     fin   y=%d'%y)
