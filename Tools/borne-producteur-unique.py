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
   recopiant. **Réduire la population n'est pas fermer la classe.** Ce détecteur la ferme par une ANCRE
   EXPLICITE, jamais par un motif sur la prose — la v1, qui essayait, attrapait 1 formulation sur 6.

Sortie 1 si la définition est dupliquée, 2 si l'instrument ne peut pas mesurer.
"""
import sys, re

path = sys.argv[1] if len(sys.argv) > 1 else 'Tools/redimensionnement-design.md'
try:
    text = open(path, encoding='utf-8').read()
except OSError as e:
    print(f'⛔ illisible : {e}'); sys.exit(2)

# ⛔⛔ CE QUE LA v1 DE CET INSTRUMENT FAISAIT DE FAUX (mesuré par une revue ⊥, 2026-08-31) :
#    elle matchait une TOURNURE (« PAR AXE » … « échelle du palier » à moins de 400 caractères) et
#    la docstring annonçait une garde sur la PROPRIÉTÉ. Testée sur SIX formulations de la même
#    proposition, elle en attrapait UNE — la sienne. Et DEUX producteurs vivaient déjà dans le
#    fichier qu'elle déclarait propre : l'un coupé par un retour à la ligne, l'autre à 1187
#    caractères du « PAR AXE » le plus proche.
#    ★ Mon contrôle négatif n'avait testé que la tournure IDENTIQUE : il prouvait que le motif se
#      reconnaît lui-même, jamais qu'il attrape la classe. *Un contrôle positif qui recopie le
#      prédicat ne peut pas trouver le défaut qu'il existe pour trouver.*
# ⇒ LA FORME QUI FERME : une ANCRE EXPLICITE, que la paraphrase ne peut pas produire par accident.
#    Un auteur qui redit la borne n'écrira pas le marqueur ; s'il le copie, c'est un geste
#    délibéré et visible en revue. On ne devine plus l'intention à partir des mots.
MARKER = '<!-- BORNE:DEF -->'
# Signal SECONDAIRE, tolérant aux blancs et aux tournures : il ne DÉCIDE pas, il SIGNALE, parce
# qu'aucun motif sur de la prose ne peut prétendre couvrir la classe (c'est la leçon ci-dessus).
UNITE = re.compile(r'(PAR\s+AXE|en\s+X\s+et\s+en\s+Y).{0,600}?(échelle\s+du\s+palier|fond\s*[·×]\s*s)',
                   re.S | re.I)
CONTROL = re.compile(r'atteignab', re.I)

defs = [MARKER] * text.count(MARKER)
signals = UNITE.findall(re.sub(r'\s+', ' ', text))
ctrl = CONTROL.findall(text)

print(f'  marqueurs {MARKER} .......... {len(defs)}  (LA décision)')
print(f'  énoncés d unité repérés ..... {len(signals)}  (signal, ne décide pas)')
print(f'  contrôle positif ............ {len(ctrl)} occurrences de « atteignab » '
      f'({"l instrument LIT" if ctrl else "RIEN LU"})')

if not ctrl:
    print('⛔ contrôle positif MUET.'); sys.exit(2)
if len(defs) == 0:
    print(f'\n  ⇒ ⛔ AUCUN marqueur : la définition unique n existe pas ou a été renommée.')
    sys.exit(1)
if len(defs) > 1:
    print(f'\n  ⇒ ⛔ {len(defs)} marqueurs — la classe se rouvre.')
    sys.exit(1)
EXPECTED_SIGNAL = 2   # PLANCHER IRRÉDUCTIBLE, mesuré : 1 définition + 1 RÉCIT de la faute d'unité.
# ⚠️ Le récit ne peut PAS descendre à 0 : expliquer une erreur d'unité exige d'énoncer l'unité —
#    c'est le piège de citation du socle (« décrire un correctif est un acte de citation »), et il
#    est ici IRRÉDUCTIBLE, pas négligé. Un signal > 2 mérite qu'on aille voir ; un signal de 2 est
#    l'état sain. On l'écrit plutôt que de laisser un lecteur croire que 0 serait l'objectif.
if len(signals) > EXPECTED_SIGNAL:
    print(f'\n  ⚠️  {len(signals)} énoncés d unité (plancher {EXPECTED_SIGNAL}) — un producteur a pu réapparaître.')
    print('     Ce script NE DÉCIDE PAS là-dessus : il signale. Aller lire.')
print(f'\n  ⇒ ✅ UN marqueur. ⚠️ Et {len(signals)} énoncés d unité subsistent en prose : ce script')
print('     NE PEUT PAS dire s ils citent ou redisent — il décide sur le MARQUEUR, pas sur les mots.')
