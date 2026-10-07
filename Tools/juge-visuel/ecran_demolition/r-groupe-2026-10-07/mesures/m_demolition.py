# -*- coding: utf-8 -*-
"""㉝ Démolition — mesures du juge visuel ⊥, tour « r-groupe », 2026-10-07.

Référence d'ÉTAT : cadre 79 « L'organisation frotte » (ecrans-brennar-6.html) — c'est le
gabarit homologue de la capture (compteur de friction + titre + bande basse + CTA). Le compte
neuf a 0 friction là où le cadre en a 7 : on compare le GABARIT, pas la valeur.
Témoin secondaire : cadre 80 « Ce bâtiment vous coûte » = le PNG commité
`ecran_demolition/reference-1080x2102.png` (identité prouvée par m_identite_references.py).
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
REF='/tmp/claude-1000/-home-erutheone-project-mafia-clean-city/64b6f928-1e0e-49fc-9e29-b231486e059a/scratchpad/refs/'
CAP='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/planches-par-ecran-2026-10-07/'
print('== images lues =='); 
r79=ouvrir(REF+'s6-79.png'); r80=ouvrir(REF+'s6-80.png')
c24=ouvrir(CAP+'E06_Dmolition_1080x2400.png'); c19=ouvrir(CAP+'E06_Dmolition_1080x1920.png')

print('\n== CONTRÔLE POSITIF — ce que l instrument trouve ÉGAL ==')
print(' 1. largeur ref %d = largeur capture %d → facteur %.3f (comparaison px DIRECTE en X)'
      % (r79.size[0], c24.size[0], c24.size[0]/r79.size[0]))
print(' 2. encre du grand titre      ref %s  capt %s' % (couleur_texte(r79,(50,468,560,512)), couleur_texte(c24,(45,282,940,318))))
print(' 3. or du texte de CTA        ref %s  capt %s' % (couleur_texte(r79,(95,1970,700,2010)), couleur_texte(c24,(90,1958,580,1996))))
print(' 4. fond d écran (médiane)    ref %s  capt %s' % (mediane_fenetre(r79,470,1400,610,1500), mediane_fenetre(c24,470,1500,610,1600)))
print(' 5. contraste titre/fond      ref %.2f:1  capt %.2f:1'
      % (contraste(couleur_texte(r79,(50,468,560,512)), couleur_fond(r79,(50,468,560,512))),
         contraste(couleur_texte(c24,(45,282,940,318)), couleur_fond(c24,(45,282,940,318)))))
print(' 6. la carte-compteur existe des DEUX côtés : ref y 612..787 / capt y 485..633')
print(' 7. le CTA existe des DEUX côtés : ref y 1938..2042 (h=105) / capt y 1954..2097 (h=144)')
print(' 8. CONTRÔLE NÉGATIF de l instrument d encre : encre du titre capt = %.2f %% (≠ 0)'
      % encre(c24,277,363,40,1040)[0])

print('\n== ÉCART ASSUMÉ (lot décor en cours — inventorié, NON classé) ==')
for nom,im,H in [('ref 79   ',r79,2102),('capt 2400',c24,2400),('capt 1920',c19,1920)]:
    pr=profil_lignes(im,0,H); plats=sum(1 for _,_,d in pr if d<8)
    print('  %s lignes PLATES (écart max-min < 8 sur la ligne) : %4d/%4d = %2.0f %%' % (nom,plats,H,100.0*plats/H))
print('  bande de scène (y 0..420) : ref 0 ligne plate, capture 110 → l art peint est remplacé par un aplat')

print('\n== A1 · la voix du lieutenant au-dessus du CTA — ABSENTE ==')
print('  ref 79  encre y 1815..1925 (110 px juste au-dessus du CTA) = %.2f %%' % encre(r79,1815,1925,40,1040)[0])
print('  ref 80  encre y 1815..1925                                  = %.2f %%' % encre(r80,1815,1925,40,1040)[0])
print('  capt2400 encre y 1844..1954 (110 px juste au-dessus du CTA) = %.2f %%' % encre(c24,1844,1954,40,1040)[0])
print('  capt1920 encre y 1364..1474                                  = %.2f %%' % encre(c19,1364,1474,40,1040)[0])
print('  bbox mesurée de la voix dans la ref 79 : y 1825..1893 (2 lignes, h=69 px = 3,3 %% de l écran)')

print('\n== A2 · la liste « VOS 4 SITES » — EN TROP (aucun des 6 cadres 79-84 ne porte de liste de sites) ==')
print('  capt2400 : libellé y 681..699 + 4 rangées y 748..877 / 896..1024 / 1043..1172 / 1191..1320')
print('             bloc y 681..1320 = %d px = %.1f %% de la hauteur' % (1320-681, 100.0*(1320-681)/2400))
print('  capt1920 : même bloc = 640 px = %.1f %% de la hauteur' % (100.0*640/1920))

print('\n== B1 · le vide entre la liste et le CTA ==')
print('  capt2400 : y 1321..1953 = %d px sans encre = %.1f %% de la hauteur' % (633,100.0*633/2400))
print('  capt1920 : y ~1321..1473 = 153 px (le vide se résorbe à 1920)')

print('\n== contrastes des textes de la capture (planchers : 3:1 grands, 4,5:1 petits) ==')
for nom,box in [('titre',(45,282,940,318)),('sous-titre',(45,392,390,416)),('« VOS 4 SITES »',(45,681,250,700)),
                ('nom de site',(80,778,310,806)),('ligne grise de site',(80,826,620,846)),
                ('étiquette « libre »',(930,940,1000,962)),('texte du CTA',(90,1958,580,1996))]:
    t=couleur_texte(c24,box); f=couleur_fond(c24,box)
    print('  %-22s encre %-16s fond %-16s → %5.2f:1' % (nom,str(t),str(f),contraste(t,f)))
