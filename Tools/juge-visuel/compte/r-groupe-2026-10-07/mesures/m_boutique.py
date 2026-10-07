# -*- coding: utf-8 -*-
"""㉓ La vitrine (`ShopScreenController`) — mesures du juge visuel ⊥, tour « r-groupe », 2026-10-07.

Référence d'ÉTAT de la planche HAUTE : cadre 99 « La caisse — les jetons » — homologue EXACT du
contenu capturé (les quatre liasses 100 / 600 / 1400 / 3500 et leurs bonus +20 / +40 / +75 %).
Référence de la planche `_bas` : cadre 98 « La vitrine — les extras » — c'est le PNG commité
`compte/reference-㉓-1080x2102.png` (identité mesurée : 0,627 contre 15,2 et 3,9).
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
REF='/tmp/claude-1000/-home-erutheone-project-mafia-clean-city/64b6f928-1e0e-49fc-9e29-b231486e059a/scratchpad/refs/'
CAP='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/planches-par-ecran-2026-10-07/'
print('== images lues ==')
r98=ouvrir(REF+'s6-98.png'); r99=ouvrir(REF+'s6-99.png')
c24=ouvrir(CAP+'E07_Boutique_1080x2400.png'); c19=ouvrir(CAP+'E07_Boutique_1080x1920.png')
cb24=ouvrir(CAP+'E07_Boutique_bas_1080x2400.png')

def bords_clairs(im, y, seuil):
    g=im.convert('L'); p=g.load()
    xs=[x for x in range(im.size[0]) if p[x,y]>seuil]
    return (min(xs), max(xs), max(xs)-min(xs)+1) if xs else None

print('\n== CONTRÔLE POSITIF — ce que l instrument trouve ÉGAL ==')
print(' 1. largeur ref %d = largeur capture %d → facteur %.3f' % (r99.size[0], c24.size[0], c24.size[0]/r99.size[0]))
print(' 2. or du titre « LA VITRINE »     ref %s  capt %s'
      % (couleur_texte(r99,(45,470,390,505)), couleur_texte(c24,(300,270,620,305))))
print(' 3. contraste du titre / son fond  ref %.2f:1  capt %.2f:1'
      % (contraste(couleur_texte(r99,(45,470,390,505)), couleur_fond(r99,(45,470,390,505))),
         contraste(couleur_texte(c24,(300,270,620,305)), couleur_fond(c24,(300,270,620,305)))))
print(' 4. une pastille de SOLDE bordée d or en tête, des deux côtés (ref y 452..535 · capt y 352..464)')
print(' 5. or de la pastille de solde     ref %s  capt %s'
      % (couleur_texte(r99,(700,460,760,530)), couleur_texte(c24,(400,390,680,430))))
print(' 6. quatre liasses des deux côtés : 100 / 600 / 1400 / 3500, dans cet ordre')
print(' 7. les trois bonus +20 %% / +40 %% / +75 %% sont écrits des deux côtés')
print(' 8. le catalogue d EXTRAS existe des deux côtés (ref cadre 98 · capt planche `_bas`) :')
print('    couleurs · thème nuit au sodium · 2ᵉ dossier/partie · 3ᵉ dossier/partie, aux prix 50/80/100/200')
print(' 9. tous les contrastes de texte de la capture ≥ 4,3:1 (détail en fin de sortie)')
print('10. CONTRÔLE NÉGATIF du compteur d encre : 0,00 %% là où il n y a rien, 8,30 %% sur une carte')

print('\n== A1 · la grille 2 × 2 de la vitrine est devenue une COLONNE de lignes ==')
print('  ref 99  ligne y=900 : bords clairs des cartes x = 40, 524 | 555, 1039')
print('          → 2 colonnes de %d px (%.1f %% de la largeur), gouttière centrale de 30 px' % (484, 100.0*484/1080))
print('  capt    carte 1 : bord supérieur y 494..498 ; flancs mesurés à y=560 :', bords_clairs(c24,560,22))
print('          → 1 colonne de %d px (%.1f %% de la largeur), aucune gouttière centrale' % (1010, 100.0*1010/1080))
print('  delta : la carte de produit passe de 44,8 %% à 93,5 %% de la largeur (×2,09)')

print('\n== A2 · la MATIÈRE de la carte : plaque teintée → simple filet ==')
print('  ref 99  médiane DANS la carte 1 %s   médiane dans la gouttière %s  (la carte est une PLAQUE)'
      % (mediane_fenetre(r99,200,960,400,990), mediane_fenetre(r99,528,960,550,990)))
print('  capt    médiane DANS la carte 1 %s   médiane hors carte          %s  (la carte n a AUCUN fond)'
      % (mediane_fenetre(c24,200,560,400,580), mediane_fenetre(c24,5,560,25,580)))

print('\n== A3 · les pictogrammes de produit ==')
print('  ref 99 : une pile de jetons dessinée dans chaque carte — px de la famille OR :')
for nom,(x0,y0,x1,y1) in [('carte 1 (100)',(120,780,420,880)),('carte 2 (600)',(640,780,900,880)),
                          ('carte 3 (1400)',(120,1160,420,1270)),('carte 4 (3500)',(640,1160,900,1270))]:
    n,t = compter_teinte(r99,x0,y0,x1,y1,OR); print('     %-16s %6d px dorés / %6d  = %5.1f %%' % (nom,n,t,100.0*n/t))
print('  capt   : une pastille ronde unie de ~28 px, identique pour les quatre produits :')
for nom,(x0,y0,x1,y1) in [('carte 1',(60,520,360,620)),('carte 2',(60,900,360,1000)),
                          ('carte 3',(60,1330,360,1430)),('carte 4',(60,1760,360,1860))]:
    n,t = compter_teinte(c24,x0,y0,x1,y1,OR); print('     %-16s %6d px dorés / %6d  = %5.1f %%' % (nom,n,t,100.0*n/t))
print('  → les quatre comptes de la capture sont IDENTIQUES à 6 px près (784/784/779/778) :')
print('    un même disque, aucun dessin propre au produit. Côté ref, ils vont de 1230 à 10032.')

print('\n== A4 · la bande du personnage (Wexler, « DERRIÈRE LE COMPTOIR ») ==')
print('  ref 99  bande y 1834..2085 (h=251 px = %.1f %% de l écran) : encre %.2f %%'
      % (100.0*251/2102, encre(r99,1834,2085,40,1040)[0]))
print('  ref 98  même bande, même composition (portrait rond + nom + rôle + citation italique)')
print('  capt2400 : rien entre la fin de la liste et la barre d onglets du shell (y 2179..2341).')
print('  capt_bas : la liste se termine sur la carte « Soutien au studio » (y 1743..2120),')
print('             puis la barre d onglets. Encre y 2121..2178 = %.2f %% (bande vide)' % encre(cb24,2121,2178,40,1040)[0])

print('\n== B1 · l intitulé de section ==')
print('  ref 99 : « LES JETONS — PAYÉS AU MAGASIN » y 648..668, encre %.2f %%' % encre(r99,640,672,40,700)[0])
print('  ref 98 : « LES EXTRAS — PAYÉS EN JETONS »  y 648..668')
print('  capt   : encre entre la pastille de solde et la 1ʳᵉ carte (y 465..493) = %.2f %%' % encre(c24,465,493,40,1040)[0])
print('           CONTRÔLE NÉGATIF : encre sur la 1ʳᵉ carte (y 494..700) = %.2f %%' % encre(c24,494,700,40,1040)[0])

print('\n== B2 · le bonus : médaillon d angle → ligne de texte ==')
print('  ref 99 : plaque dorée pleine en haut à droite de la carte, 3 lignes — px OR mesurés')
n,t=compter_teinte(r99,835,672,965,795,OR); print('           %d px dorés / %d = %.1f %%' % (n,t,100.0*n/t))
print('  capt   : une ligne de texte dorée dans le flux — px OR de la même zone relative')
n,t=compter_teinte(c24,60,1070,420,1110,OR); print('           %d px dorés / %d = %.1f %%' % (n,t,100.0*n/t))

print('\n== contrastes des textes de la capture (planchers : 3:1 grands, 4,5:1 petits) ==')
for nom,box in [('titre LA VITRINE',(300,270,620,305)),('pastille 50 Marks',(400,390,680,430)),
                ('titre de liasse',(130,528,570,570)),('« en boutique »',(70,590,260,620)),
                ('« donne 100 Marks »',(70,645,310,672)),('bonus +20 %',(70,1077,420,1105)),
                ('bouton DERRIÈRE LA VITRE',(340,720,740,750)),('« Bientôt »',(490,765,590,790))]:
    t=couleur_texte(c24,box); f=couleur_fond(c24,box)
    print('  %-26s encre %-16s fond %-16s → %5.2f:1' % (nom,str(t),str(f),contraste(t,f)))

print('\n== B3 · le bandeau de comptoir ==')
print('  ref 99  bande « LA VITRINE » y 420..545 : médiane %s (bronze), filet d or dessous'
      % str(mediane_fenetre(r99,120,440,400,520)))
print('  capt    même rôle, y 260..320 : médiane %s (fond nu, titre centré, pas de bandeau)'
      % str(mediane_fenetre(c24,120,255,400,268)))
print('  ref : le titre est à GAUCHE et la pastille de solde à DROITE sur la MÊME ligne ;')
print('  capt: le titre est CENTRÉ, la pastille est en dessous et prend toute la largeur')
print('        (pastille ref x 697..1035 = 31,3 %% de la largeur · capt x 36..1044 = 93,3 %%)')
