#!/usr/bin/env python3
"""Asserte que la BORNE d'atteignabilité n'est DÉFINIE qu'à un seul endroit.

⛔ POURQUOI CE SCRIPT EXISTE (mesuré v11→v15, quatre tours) : la borne était publiée en
   CINQ exemplaires. Quatre tours de suite, un correctif en a mis un à jour et laissé les
   autres — arrivée/sauvegarde, consommateur/producteur, 2D/1D. Le compte le disait déjà
   (5 mentions, 3 justes, 2 fausses) : ce chiffre ne descend pas en corrigeant 2, il
   descend en passant de 5 à 1.
   ⇒ La v15 est passée à UNE définition + QUATRE citations. Mais une définition unique ne
   tient que tant que personne ne REDIT la valeur — et le sixième exemplaire arriverait par
   le geste le plus naturel : quelqu'un qui trouve la citation indirecte et « clarifie » en
   recopiant. **Réduire la population n'est pas fermer la classe ; ce détecteur la ferme.**

Sortie 1 si la définition est dupliquée, 2 si l'instrument ne peut pas mesurer.
"""
import sys, re

path = sys.argv[1] if len(sys.argv) > 1 else 'Tools/redimensionnement-design.md'
try:
    text = open(path, encoding='utf-8').read()
except OSError as e:
    print(f'⛔ illisible : {e}'); sys.exit(2)

# La SIGNATURE de la définition — ce qui fait qu'un texte DÉFINIT au lieu de citer.
# Motif large sur la PROPRIÉTÉ (par axe + unité), jamais sur une tournure vue une fois :
# deux formulations du même faux exigent deux motifs, donc on vise ce qui ne peut pas
# être dit autrement — la conjonction « par axe » ET « échelle du palier ».
DEFN = re.compile(r'PAR AXE.{0,400}?échelle du palier', re.S | re.I)
# Contrôle POSITIF, sur LA MÊME POPULATION que le motif surveillé (le fichier entier) :
# un terme dont on SAIT qu'il y est. Sans lui, un `0` ne distingue pas « rien ne matche »
# de « rien n'a été lu ».
CONTROL = re.compile(r'atteignab', re.I)

defs = DEFN.findall(text)
ctrl = CONTROL.findall(text)

print(f'  définitions trouvées ..... {len(defs)}')
print(f'  contrôle positif ......... {len(ctrl)} occurrences de « atteignab » '
      f'({"l instrument LIT" if ctrl else "⛔ RIEN LU"})')

if not ctrl:
    print('⛔ contrôle positif MUET — le zéro ci-dessus ne prouverait rien.')
    sys.exit(2)
if len(defs) == 1:
    print('\n  ⇒ ✅ UNE seule définition. Les autres mentions doivent CITER, jamais redire.')
    sys.exit(0)
print(f'\n  ⇒ ⛔ {len(defs)} définitions — la classe se rouvre. Extraits :')
for d in defs:
    print(f'      …{" ".join(d.split())[:100]}…')
sys.exit(1)
