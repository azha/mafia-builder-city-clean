# m23 — bord gauche du libelle "ARGENT" et hauteur de capitale, en CSS (canon vs capture).
from PIL import Image
def mesure(path,ech,y0,y1,label,xmax=420,seuil=3*95):
    im=Image.open(path).convert('RGB'); px=im.load()
    print('OUVERT %s %s'%(path,im.size))
    cs=[x for x in range(0,xmax) if any(sum(px[x,y])>seuil for y in range(y0,y1))]
    ys=[y for y in range(y0,y1) if any(sum(px[x,y])>seuil for x in range(0,xmax))]
    print('  %s : x %d..%d  y %d..%d  | CSS x %.1f..%.1f  hauteur d encre %.2f CSS'%(
        label,min(cs),max(cs),min(ys),max(ys),min(cs)/ech,max(cs)/ech,(max(ys)-min(ys)+1)/ech))
    return min(cs)/ech
print('--- libelle ARGENT (bande haute) ---')
a=mesure('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png',3.0,30,52,'CANON')
b=mesure('../capture-1080x2400.png',1080/392.0,22,50,'CAPTURE',xmax=420)
print('  -> le libelle ARGENT du CANON commence a %.1f CSS ; celui de la CAPTURE a ...'%a)
print()
print('--- meme chose en excluant le coin gauche (x>=130 px) pour ecarter la fleche retour ---')
def mesure2(path,ech,y0,y1,label,x0=130,xmax=420,seuil=3*95):
    im=Image.open(path).convert('RGB'); px=im.load()
    cs=[x for x in range(x0,xmax) if any(sum(px[x,y])>seuil for y in range(y0,y1))]
    ys=[y for y in range(y0,y1) if any(sum(px[x,y])>seuil for x in range(x0,xmax))]
    print('  %s : x %d..%d  y %d..%d | CSS x %.1f..%.1f  hauteur d encre = %.2f CSS'%(
        label,min(cs),max(cs),min(ys),max(ys),min(cs)/ech,max(cs)/ech,(max(ys)-min(ys)+1)/ech))
mesure2('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png',3.0,30,52,'CANON  ',x0=30)
mesure2('../capture-1080x2400.png',1080/392.0,22,50,'CAPTURE',x0=130)
print()
print('--- la fleche retour de la CAPTURE (x 60..130) ---')
im=Image.open('../capture-1080x2400.png').convert('RGB'); px=im.load()
cs=[x for x in range(40,140) if any(sum(px[x,y])>3*95 for y in range(50,100))]
ys=[y for y in range(50,100) if any(sum(px[x,y])>3*95 for x in range(40,140))]
print('  fleche : x %d..%d y %d..%d | CSS x %.1f..%.1f y %.1f..%.1f'%(min(cs),max(cs),min(ys),max(ys),
      min(cs)/(1080/392.),max(cs)/(1080/392.),min(ys)/(1080/392.),max(ys)/(1080/392.)))
print('--- meme fenetre dans le CANON (rien attendu : l ecran principal n a pas de retour) ---')
im2=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB'); p2=im2.load()
cs2=[x for x in range(int(40*3/2.755),int(140*3/2.755)) if any(sum(p2[x,y])>3*95 for y in range(int(50*3/2.755),int(100*3/2.755)))]
print('  canon, fenetre homologue : %d colonnes d encre'%len(cs2))
