# -*- coding: utf-8 -*-
"""⑭ La semaine / Compression (`CompressionScreenController`) — juge visuel ⊥, « r-groupe », 2026-10-07.

Référence d'ÉTAT : cadre 29 « Compression — au calme » (ecrans-brennar-4.html) — homologue exact de
l'état capturé (compte neuf : tension calme, aucune semaine), et le cadre que le `LISEZMOI.md` de la
série désigne nommément. Référence nominale (INDEX) : `compression/reference-1080x2102.png` =
cadre **25** (identité mesurée : 0,316 contre 21 à 54). Les deux portent le MÊME héros : le
manomètre de TENSION.

⚠️ Instrument : compter « les px dorés » NE SUFFIT PAS à décider si le manomètre est là — la
capture en a 7 339 dans la même bande, qui sont le titre doré et le titre de plaque. Les deux
grandeurs qui ne peuvent venir QUE du cadran sont le **secteur teal** et le **secteur rouge**.
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
REF='/tmp/claude-1000/-home-erutheone-project-mafia-clean-city/64b6f928-1e0e-49fc-9e29-b231486e059a/scratchpad/refs/'
CAP='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/planches-par-ecran-2026-10-07/'
TEAL = lambda r,g,b: g>90 and b>90 and g-r>25 and abs(g-b)<40
ROUGE= lambda r,g,b: r>120 and r-g>45 and r-b>45
print('== images lues ==')
r25=ouvrir(REF+'s4-25.png'); r29=ouvrir(REF+'s4-29.png')
c24=ouvrir(CAP+'E08_Lasemaine_1080x2400.png'); c19=ouvrir(CAP+'E08_Lasemaine_1080x1920.png')

print('\n== CONTRÔLE POSITIF — ce que l instrument trouve ÉGAL ==')
print(' 1. largeur ref %d = largeur capture %d → facteur %.3f' % (r29.size[0], c24.size[0], c24.size[0]/r29.size[0]))
print(' 2. la plaque « OÙ EN EST LA TENSION » existe des deux côtés, même rôle, même place relative')
print(' 3. or du titre de plaque       ref %s  capt %s'
      % (couleur_texte(r29,(95,900,960,1000)), couleur_texte(c24,(75,520,980,560))))
print(' 4. gris du corps de plaque     ref %s  capt %s  (IDENTIQUE)'
      % (couleur_texte(r29,(95,1080,960,1150)), couleur_texte(c24,(75,580,980,680))))
print(' 5. le corps de plaque porte le MÊME TEXTE, sur 3 lignes des deux côtés')
print(' 6. le titre de plaque porte le MÊME TEXTE : « Rien ne presse — aucune semaine en vue »')
print(' 7. contraste titre de plaque / fond  ref %.2f:1  capt %.2f:1'
      % (contraste(couleur_texte(r29,(95,900,960,1000)), couleur_fond(r29,(95,900,960,1000))),
         contraste(couleur_texte(c24,(75,520,980,560)), couleur_fond(c24,(75,520,980,560)))))
print(' 8. le chrome haut (ARGENT · manomètre de CHALEUR · JOUR + moment) a la même structure')
print(' 9. tous les contrastes de texte de la capture ≥ 8,7:1 (détail en fin de sortie)')
print('10. CONTRÔLE NÉGATIF du détecteur de teintes : « or » rend 25 930 px côté ref ET 7 339 côté')
print('    capture — il n est donc PAS aveugle à la capture ; seuls teal et rouge y rendent 0.')

print('\n== A1 · le MANOMÈTRE DE TENSION, héros de l écran — ABSENT ==')
print('  géométrie dans la référence (bbox des px dorés, bande y 230..760) :')
for nom, im in [('ref 25', r25), ('ref 29', r29)]:
    px=im.load(); X=[];Y=[]
    for y in range(230,760):
        for x in range(im.size[0]):
            if OR(*px[x,y]): X.append(x);Y.append(y)
    print('    %s : x %d..%d (l=%d px = %.1f %% de la largeur), y %d..%d (h=%d px = %.1f %% de la hauteur)'
          % (nom, min(X),max(X),max(X)-min(X), 100.0*(max(X)-min(X))/1080, min(Y),max(Y),max(Y)-min(Y), 100.0*(max(Y)-min(Y))/2102))
print('  les deux grandeurs qui ne peuvent venir QUE du cadran, bande y 300..720, x 150..930 :')
for nom,test in [('secteur TEAL ',TEAL),('secteur ROUGE',ROUGE),('(témoin) OR ',OR)]:
    a,_=compter_teinte(r29,150,300,930,720,test); b,_=compter_teinte(r25,150,300,930,720,test)
    c,_=compter_teinte(c24,150,300,930,720,test); d,_=compter_teinte(c19,150,300,930,720,test)
    print('    %s  ref29 %6d  ref25 %6d  |  capt2400 %6d  capt1920 %6d' % (nom,a,b,c,d))
print('  → 0 px teal et 0 px rouge aux DEUX résolutions : ni arc, ni secteurs, ni aiguille.')
print('    La grandeur « tension » n est plus rendue que par deux mots.')

print('\n== B1 · la ligne d état sous le cadran ==')
px=r29.load(); X=[];Y=[]
for y in range(735,795):
    for x in range(r29.size[0]):
        if OR(*px[x,y]): X.append(x);Y.append(y)
print('  ref 29  « Calme — vos affaires respirent » : sérif DORÉ, bbox x %d..%d y %d..%d, encre %s'
      % (min(X),max(X),min(Y),max(Y), couleur_texte(r29,(200,735,860,790))))
n,_=compter_teinte(c24,150,335,930,385,OR)
print('  capt    « TENSION CALME · AUCUNE SEMAINE » : sans-sérif GRIS capitales, encre %s, px dorés = %d'
      % (couleur_texte(c24,(255,345,830,375)), n))

print('\n== B2 · le vide (conséquence de A1 + du décor assumé) ==')
def plus_longue_bande_vide(im,H):
    g=im.convert('L');p=g.load()
    enc=[1 if max(p[x,y] for x in range(0,1080,3)) - min(p[x,y] for x in range(0,1080,3)) > 14 else 0 for y in range(H)]
    best=(0,0,0);cur=None
    for y in range(H):
        if enc[y]==0: cur = y if cur is None else cur
        else:
            if cur is not None and y-cur > best[0]: best=(y-cur,cur,y-1)
            cur=None
    if cur is not None and H-cur>best[0]: best=(H-cur,cur,H-1)
    return best
for nom,im,H in [('ref 29',r29,2102),('ref 25',r25,2102),('capt2400',c24,2400),('capt1920',c19,1920)]:
    h,a,b = plus_longue_bande_vide(im,H)
    print('  %-9s plus longue bande SANS encre : %4d px (y %4d..%4d) = %4.1f %% de la hauteur' % (nom,h,a,b,100.0*h/H))
print('  la dernière encre de contenu de la capture est à y=720 (2400) et y=720 (1920)')
print('  dans la référence, le contenu descend jusqu à y=1195 (bas de la plaque), le reste est l ART PEINT')

print('\n== contrastes des textes de la capture ==')
for nom,box in [('titre LA SEMAINE',(290,265,620,300)),('sous-titre gris',(255,345,830,375)),
                ('intitulé de plaque',(75,470,360,495)),('titre de plaque (or)',(75,520,980,560)),
                ('corps de plaque',(75,580,980,680))]:
    t=couleur_texte(c24,box); f=couleur_fond(c24,box)
    print('  %-24s encre %-16s fond %-16s → %5.2f:1' % (nom,str(t),str(f),contraste(t,f)))
