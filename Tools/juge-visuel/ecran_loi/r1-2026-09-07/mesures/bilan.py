# Bilan : paddings internes des cartes, occupation verticale, et les grandeurs EGALES.
# Controle positif : padding gauche de carte attendu 10 CSS x3,6 = 36 px (CSS .pl-choix padding:8px 10px).
# Controle negatif : la meme sonde entre deux cartes (y=840) doit ne rien trouver.
from PIL import Image
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
pc=cap.load(); pr=ref.load()
def premier(im,y0,y1,x0,x1,fond,seuil=25):
    px=im.load()
    for x in range(x0,x1):
        if any(abs(lum(px[x,y])-lum(fond))>seuil for y in range(y0,y1)): return x
def dernier(im,y0,y1,x0,x1,fond,seuil=25):
    px=im.load()
    for x in range(x1-1,x0-1,-1):
        if any(abs(lum(px[x,y])-lum(fond))>seuil for y in range(y0,y1)): return x
print()
print('CARTES (boite x 57..1022) :')
for nom,y0,y1 in [('c1 titre',700,740),('c1 sous-titre',765,805),('c2 titre',881,921),('c3 titre',1061,1101)]:
    g=premier(cap,y0,y1,58,400,(34,42,46)); print('  %-14s encre a partir de x=%s -> padding gauche %d px = %.2f CSS (CSS 10)'%(nom,g,g-57,(g-57)/3.6))
d=dernier(cap,700,740,700,1022,(34,42,46)); print('  c1 tag        encre jusqu a x=%s -> padding droit %d px = %.2f CSS (CSS 10)'%(d,1022-d,(1022-d)/3.6))
print('CONTROLE NEGATIF entre deux cartes (y 835..848) :', premier(cap,835,848,58,400,(13,13,13)))
print()
print('REFERENCE .pl-item (boite x 50..1029) padding gauche :')
g=premier(ref,985,1010,52,300,(30,36,43)); print('   encre a partir de x=%s -> %d px = %.2f CSS (CSS .pl-item padding 8px lat. + pastille)'%(g,g-50,(g-50)/3.6))
print()
print('OCCUPATION VERTICALE')
print('  capture : filet bandeau bas y=143 ; premiere encre de contenu y=215 ; derniere y=1450 ; haut du dock y=2179')
print('    rect libre  = 2179-143 = %d px = %.1f CSS(contenu x3,6)'%(2179-143,(2179-143)/3.6))
print('    occupe      = 1450-215 = %d px = %.1f CSS'%(1450-215,(1450-215)/3.6))
print('    vide en bas = 2179-1450 = %d px = %.1f CSS = %.1f %% du rect libre'%(2179-1450,(2179-1450)/3.6,100*(2179-1450)/(2179-143)))
print('  reference : panneau y=434..2085 (h=%d px = %.1f CSS)'%(2085-434,(2085-434)/3.6))
print('    dernier item bas y=1392 ; .pl-bas haut y=1745')
print('    trou median = %d px = %.1f CSS = %.1f %% du panneau'%(1745-1392,(1745-1392)/3.6,100*(1745-1392)/(2085-434)))
print('    bande basse .pl-bas = %d px = %.1f CSS (voix + geste), PLEINE'%(2085-1745,(2085-1745)/3.6))
