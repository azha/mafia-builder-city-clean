#!/usr/bin/env python3
"""Asserte que la BORNE d'atteignabilité n'est DÉFINIE qu'à un seul endroit.

⛔ POURQUOI CE SCRIPT EXISTE (mesuré v11→v15, quatre tours) : la borne était publiée en CINQ
   exemplaires. Quatre tours de suite, un correctif en a mis un à jour et laissé les autres —
   arrivée/sauvegarde, consommateur/producteur, 2D/1D. Le compte le disait déjà (5 mentions,
   3 justes, 2 fausses) : ce chiffre ne descend pas en corrigeant 2, il descend en passant de 5 à 1.
   ⇒ La v15 est passée à UNE définition + QUATRE citations. Mais une définition unique ne tient
   que tant que personne ne REDIT la valeur — et le sixième exemplaire arriverait par le geste le
   plus naturel : quelqu'un qui trouve la citation indirecte et « clarifie » en recopiant.

⛔⛔ CE QUE LA v3 FAISAIT DE TROP, ET POURQUOI C'ÉTAIT PIRE (mesuré 2026-08-31, revue ⊥).
   Elle découpait le paragraphe du marqueur par `rfind`/`find` et comptait un motif de prose
   DEDANS et DEHORS. Vingt lignes d'appareil positionnel — pour une propriété que DEUX comptes
   littéraux tranchent. Et l'appareil était plus FAIBLE : sur un second producteur écrit dans une
   forme que le motif attrape, il rendait ⚠️ **et** ✅ **et** exit 0, alors que son propre
   commentaire disait « DEHORS on exige 0 ». *Une garde qui signale sans décider est une garde qui
   certifie.* ⇒ Le littéral d'unité est compté DANS LE DOCUMENT ENTIER (il doit valoir 1) et SUR LA
   LIGNE DU MARQUEUR (il doit valoir 1). Un second producteur VISIBLE fait passer le total à 2 : rouge.

   ⇒ **CE QU'IL FERME** : le marqueur dupliqué, absent ou renommé ; la définition qui perd son
      littéral ; et un second producteur qui RECOPIE le littéral — le geste que la docstring
      donnait comme raison d'exister, et que la v3 laissait passer.
   ⇒ **CE QU'IL NE FERME PAS** : une redite PARAPHRASÉE. Mesuré sur six paraphrases écrites sans
      marqueur ni littéral : il en détecte ZÉRO. **La classe reste ARBITRÉE EN REVUE.**
   ⚠️ Et des contrôles « marqueur présent / dupliqué / absent » sont trois variations du PRÉDICAT,
      pas de la propriété : *un contrôle qui recopie le prédicat teste l'identité, pas la
      couverture*. Le seul qui morde — un producteur sans marqueur ni littéral — rend 0/6.

Sortie 1 si la définition est dupliquée ou redite, 2 si l'instrument ne peut pas mesurer.
"""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'Tools/redimensionnement-design.md'
try:
    text = open(path, encoding='utf-8').read()
except OSError as e:
    print(f'⛔ illisible : {e}'); sys.exit(2)

# ⇒ LA FORME QUI ARBITRE : une ANCRE EXPLICITE, que la paraphrase ne peut pas produire par
#    accident. Un auteur qui redit la borne n'écrira pas le marqueur ; s'il le copie, c'est un
#    geste délibéré et visible en revue. On ne devine plus l'intention à partir des mots.
MARQUEUR = '<!-- BORNE:DEF -->'
# Le littéral qui PORTE l'unité. Il ne vit que dans cette commande — jamais dans la prose d'un
# rapport, sinon le rapport devient le second producteur (piège de citation, socle §7).
UNITE = 'PAR AXE (X et Y)'
CONTROLE = 'atteignab'

n_marq = text.count(MARQUEUR)
n_unite = text.count(UNITE)
ligne_def = next((l for l in text.splitlines() if MARQUEUR in l), '')
n_unite_def = ligne_def.count(UNITE)
n_ctrl = text.count(CONTROLE)

print(f'  marqueurs .................... {n_marq}   (1 attendu — LA décision)')
print(f'  littéral d unité, document ... {n_unite}   (1 attendu — un 2ᵉ producteur le ferait monter)')
print(f'  littéral d unité, ligne déf .. {n_unite_def}   (1 attendu — sinon la déf a perdu son objet)')
print(f'  contrôle positif ............. {n_ctrl} occurrences du témoin '
      f'({"l instrument LIT" if n_ctrl else "RIEN LU"})')

if not n_ctrl:
    print('\n  ⇒ ⛔ contrôle positif MUET : l instrument ne lit pas ce fichier.'); sys.exit(2)
if n_marq == 0:
    print('\n  ⇒ ⛔ AUCUN marqueur : la définition unique n existe pas ou a été renommée.'); sys.exit(1)
if n_marq > 1:
    print(f'\n  ⇒ ⛔ {n_marq} marqueurs — la classe se rouvre.'); sys.exit(1)
if n_unite_def != 1:
    print(f'\n  ⇒ ⛔ la ligne du marqueur porte {n_unite_def} littéral d unité (1 attendu) : la')
    print('     définition a perdu son objet. Ce n est PAS un vert — c est un instrument sans cible.')
    sys.exit(2)
if n_unite > 1:
    print(f'\n  ⇒ ⛔ {n_unite} littéraux d unité pour UNE définition : un second producteur a')
    print('     réapparu, exactement par le geste que cet instrument existe pour attraper.')
    sys.exit(1)
print('\n  ⇒ ✅ UN marqueur, UN littéral d unité, et il est dans la définition.')
print('     ⚠️ Une redite PARAPHRASÉE reste indétectable (0/6 mesuré) : la classe est ARBITRÉE,')
print('        pas fermée — voir la docstring.')
sys.exit(0)
