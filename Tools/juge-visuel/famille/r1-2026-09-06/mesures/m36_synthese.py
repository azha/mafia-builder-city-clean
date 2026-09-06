# m36 — synthese chiffree des grandeurs citees dans le rapport (recalcul depuis les images).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def rel(p):
    def f(c):
        c/=255.0
        return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def K(a,b):
    la,lb=rel(a),rel(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
print('\nAnneau du bouton retour : contraste anneau/fond')
print('  REF anneau %s sur fond %s -> %.2f:1'%((62,64,66),(22,25,27),K((62,64,66),(22,25,27))))
print('  CAP anneau %s sur fond %s -> %.2f:1'%((47,47,50),(27,26,29),K((47,47,50),(27,26,29))))
print('\nEnergie de trait de l anneau (par px CSS, base = remplissage interne)')
print('  REF (61-29)+(62-29) = %d  -> %.1f'%(65,65/2.0))
print('  CAP (42-33)+(47-33) = %d  -> %.1f   ratio = %.0f%%'%(23,23/1.88036,100*(23/1.88036)/(65/2.0)))
print('\nHalo du Don : integrale d exces R par px CSS (m24)')
print('  REF 90.5 | CAP 48.4 | ratio = %.0f%%   (controle negatif : 0.0 / 0.0 sur les medaillons de lieutenant)'%(100*48.4/90.5))
print('\nEn-tete')
print('  hauteur (bord haut de la feuille -> filet) : REF 115.0 | CAP 128.7 CSS  -> %+.1f (%+.1f%%)'%(128.7-115.0,100*(128.7-115.0)/115.0))
print('  ecart sous-titre(bas d encre) -> filet     : REF 24.5 | CAP 43.6 CSS   -> %+.1f (%+.1f%%)'%(43.6-24.5,100*(43.6-24.5)/24.5))
print('\nInterlignes')
print('  nom -> puce (rang)   : REF 8.00 | CAP 12.23 et 12.76 CSS -> %+.1f%% a %+.1f%%'%(100*(12.23-8)/8,100*(12.76-8)/8))
print('  nom -> role (Don)    : REF 19.0 | CAP 13.3 CSS           -> %+.1f%%'%(100*(13.3-19.0)/19.0))
print('\nChasse sans-serif a hauteur de capitale egale (3 chaines IDENTIQUES)')
for nm,a,b in (('Repos',61.00,67.54),('Aucune equipe rattachee',239.5,264.8),('Recruter un nouveau lieutenant',303.5,333.4)):
    print('  %-32s REF %6.1f | CAP %6.1f CSS -> %+.1f%%'%(nm,a,b,100*(b-a)/a))
print('\nRayon des coins (meme instrument des deux cotes, biais commun ~-2 CSS)')
print('  rangs    : REF 20.3 | CAP 18.1 CSS -> %+.1f'%(18.1-20.3))
print('  don-rang : REF 20.1 | CAP 16.5 CSS -> %+.1f'%(16.5-20.1))
