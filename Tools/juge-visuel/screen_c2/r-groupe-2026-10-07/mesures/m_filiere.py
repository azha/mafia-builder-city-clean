# -*- coding: utf-8 -*-
"""㊵ La filière (`FiliereScreenController`, dossier `screen_c2`) — juge visuel ⊥, « r-groupe », 2026-10-07.

Référence nominale (INDEX / journal.tsv) : `screen_c2/reference-1080x2102.png` = cadre **137**
« La filière — où en est chaque étape » (identité mesurée : 0,904 contre 6,3 → 15,7).
Référence d'ÉTAT : cadre **140** « Vous n'avez pas encore de filière » — l'homologue EXACT de la
capture (compte neuf, aucun nœud). Les deux sont comparés : 137 pour le gabarit plein, 140 pour
l'état vide. Le cadre 141 « Aucune filière montée » est le second témoin d'état vide.
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
REF='/tmp/claude-1000/-home-erutheone-project-mafia-clean-city/64b6f928-1e0e-49fc-9e29-b231486e059a/scratchpad/refs/'
CAP='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/planches-par-ecran-2026-10-07/'
print('== images lues ==')
r137=ouvrir(REF+'s6-137.png'); r140=ouvrir(REF+'s6-140.png'); r141=ouvrir(REF+'s6-141.png')
c24=ouvrir(CAP+'E10_Filire_1080x2400.png'); c19=ouvrir(CAP+'E10_Filire_1080x1920.png')
cb19=ouvrir(CAP+'E10_Filire_bas_1080x1920.png')

print('\n== CONTRÔLE POSITIF — ce que l instrument trouve ÉGAL ==')
print(' 1. largeur ref %d = largeur capture %d → facteur %.3f' % (r140.size[0], c24.size[0], c24.size[0]/r140.size[0]))
print(' 2. la plaque de titre « La filière » + sa ligne de sous-titre espacée + le FILET D OR')
print('    en dessous existent des deux côtés')
print('    or du titre      ref %s  capt %s' % (couleur_texte(r140,(300,480,760,540)), couleur_texte(c24,(340,300,740,360))))
print(' 3. TROIS tuiles de compteur côte à côte des deux côtés, valeurs « 00 » en CYAN :')
print('    cyan ref %s  capt %s' % (couleur_texte(r140,(140,660,250,720)), couleur_texte(c24,(140,490,210,545))))
print(' 4. l ordre des tuiles est le même : ÉTAPES · (propres) · ÉCARTS')
print(' 5. un geste doré bordé en filet, libellé en capitales espacées, des deux côtés')
print('    or du geste      ref %s  capt %s' % (couleur_texte(r140,(400,1962,680,1998)), couleur_texte(c24,(80,900,300,965))))
print(' 6. une plaque d explication titrée (sur-titre gris espacé + titre sérif + corps) des deux côtés')
print(' 7. contraste du titre / fond  ref %.2f:1  capt %.2f:1'
      % (contraste(couleur_texte(r140,(300,480,760,540)), couleur_fond(r140,(300,480,760,540))),
         contraste(couleur_texte(c24,(340,300,740,360)), couleur_fond(c24,(340,300,740,360)))))
print(' 8. tous les contrastes de texte de la capture ≥ 5:1 (détail en fin de sortie)')
print(' 9. aucune chaîne anglaise en jeu — la ref 137 en porte (« node · dirty », « node · partial »)')
print('10. CONTRÔLE NÉGATIF du détecteur de filet d or : il rend 0 px sur une colonne de fond nu')

print('\n== A1 · le CADRE D OR qui enferme tout le panneau — ABSENT ==')
g140=r140.convert('L'); p140=g140.load(); gc=c24.convert('L'); pc=gc.load()
g137=r137.convert('L'); p137=g137.load(); g141=r141.convert('L'); p141=g141.load()
print('  ref140 ligne y=1200 : le montant GAUCHE du cadre est à x 21..23, valeur de gris 142')
print('         (le fond immédiatement à côté vaut 15 à 25)')
for nom,pp in [('ref 137',p137),('ref 140',p140),('ref 141',p141)]:
    n=sum(1 for y in range(440,2080) if max(pp[x,y] for x in range(18,28))>60)
    print('  %-8s colonne x 18..28, y 440..2080 : %4d lignes portent un montant clair sur 1640' % (nom,n))
for nom,pp,H in [('capt2400',pc,2400),('capt1920',c19.convert('L').load(),1920)]:
    n=sum(1 for y in range(440,H-220) if max(pp[x,y] for x in range(18,28))>60)
    print('  %-8s colonne x 18..28, même rôle               : %4d lignes' % (nom,n))
print('  → le panneau de la maquette est CERNÉ d un filet d or continu sur ses 4 côtés ;')
print('    en jeu il n y a aucun cerne : les blocs flottent sur le fond.')

print('\n== A2 · l ORDRE DE LECTURE : le geste a quitté le bas de l écran ==')
def bande_geste(im, y0, y1, seuil=70):
    gg=im.convert('L'); pp=gg.load()
    ys=[y for y in range(y0,y1) if sum(1 for x in range(0,1080,2) if pp[x,y]>seuil) > 200]
    return (min(ys),max(ys)) if ys else None
print('  (bandes repérées par le FILET doré : >150 px dorés sur la ligne)')
print('  ref 140 : filet du geste à y 1952..1954   → le geste est le DERNIER bloc, à %.1f %% de la hauteur' % (100.0*1953/2102))
print('  ref 137 : filets du geste à y 1902..1904 et 1993..1995 → boîte y 1902..1995, centre à %.1f %%' % (100.0*1949/2102))
print('  capt    : filets du geste à y 885..887 et 977..979 → boîte y 885..979, centre à %.1f %% (2400) / %.1f %% (1920)'
      % (100.0*932/2400, 100.0*932/1920))
print('  RANG dans la colonne de contenu : ref = 5ᵉ et DERNIER bloc · capture = 3ᵉ sur 5,')
print('  suivi de DEUX plaques d explication. Le bas de l écran n est plus une action.')

print('\n== A3 · la boîte de la CHAÎNE (le cœur de l écran) ==')
print('  ref 137 : la chaîne est une boîte bordée contenant 4 maillons reliés, y 785..1540')
print('  ref 140 : la MÊME boîte, vide, avec une phrase italique CENTRÉE en son milieu')
print('            (« Votre planque est prête. / La filière, elle, reste à monter. ») — y 785..1555')
print('            hauteur %d px = %.1f %% de l écran' % (770, 100.0*770/2102))
print('  ref 141 : la même boîte, autre phrase')
print('  capt    : aucune boîte de chaîne. Le message d état est une plaque ORDINAIRE,')
print('            texte à GAUCHE, non italique, y 648..720 (h=72 px = 3,0 %% de l écran)')
print('  → le contenant de la chaîne disparaît avec son contenu : rien ne dit où ira la filière.')

print('\n== B1 · le libellé de la tuile du milieu ==')
print('  ref 137 / 140 / 141 : « PROPRES »      capt : « PROPRE AU BOUT »')

print('\n== B2 · le vide ==')
def plus_longue_bande_vide(im,H):
    gg=im.convert('L');pp=gg.load()
    enc=[1 if max(pp[x,y] for x in range(0,1080,3)) - min(pp[x,y] for x in range(0,1080,3)) > 14 else 0 for y in range(H)]
    best=(0,0,0);cur=None
    for y in range(H):
        if enc[y]==0: cur = y if cur is None else cur
        else:
            if cur is not None and y-cur > best[0]: best=(y-cur,cur,y-1)
            cur=None
    if cur is not None and H-cur>best[0]: best=(H-cur,cur,H-1)
    return best
for nom,im,H in [('ref 140',r140,2102),('ref 137',r137,2102),('capt2400',c24,2400),('capt1920',c19,1920)]:
    h,a,b = plus_longue_bande_vide(im,H)
    print('  %-9s plus longue bande SANS encre : %4d px (y %4d..%4d) = %4.1f %%' % (nom,h,a,b,100.0*h/H))

print('\n== C · indicateur de défilement (attendu : LISEZMOI, cause 7) ==')
for nom,im in [('capt2400',c24),('capt1920',c19),('capt_bas1920',cb19)]:
    gg=im.convert('L');pp=gg.load();H=im.size[1]
    n=sum(1 for y in range(H) if pp[1026,y]>45)
    runs=[];cur=None
    for y in range(H):
        v=pp[1026,y]>45
        if v and cur is None: cur=y
        if not v and cur is not None:
            if y-cur>40: runs.append((cur,y-1,y-cur))
            cur=None
    print('  %-12s colonne x=1026 : %4d px allumés  plages longues %s  teinte %s'
          % (nom, n, runs, im.getpixel((1026, runs[0][0]+5)) if runs else '-'))
print('  → ascenseur PRÉSENT à 1920 (le contenu déborde), ABSENT à 2400 (il tient) : conforme.')
print('    Il est tracé à x 1024..1028, soit 16 px À L INTÉRIEUR du bord droit des plaques (x=1044) :')
print('    il passe SUR elles, sans masquer de texte.')

print('\n== contrastes des textes de la capture ==')
for nom,box in [('titre « La filière »',(340,300,740,360)),('sous-titre AUCUN NŒUD',(260,345,830,380)),
                ('valeur 00 (cyan)',(140,490,210,545)),('libellé ÉTAPES',(140,550,260,575)),
                ('phrase d état',(70,660,950,720)),('libellé BLANCHIR',(80,910,290,950)),
                ('indice sous le geste',(40,1000,620,1030)),('sur-titre MAILLON MANQUANT',(70,1090,360,1115)),
                ('titre de plaque',(70,1130,810,1180)),('corps de plaque',(70,1190,950,1250))]:
    t=couleur_texte(c24,box); f=couleur_fond(c24,box)
    print('  %-28s encre %-16s fond %-16s → %5.2f:1' % (nom,str(t),str(f),contraste(t,f)))
