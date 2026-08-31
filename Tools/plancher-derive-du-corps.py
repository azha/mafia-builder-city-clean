#!/usr/bin/env python3
"""㉜ — DÉRIVE l'énumération du plancher depuis le CORPS (§0–§8), puis la compare à la table.

⛔ POURQUOI (BLOQUANT B2 de la revue v8, ouvert DIX versions) : le §11 porte deux membres — une
   énumération et une table — et un contrôle de bijection entre eux. Mais **les deux membres sont
   écrits dans le même §11, à la suite, par la même main** : un livrable oublié DES DEUX CÔTÉS est
   invisible, et la bijection reste verte. Mesuré : NEUF revues ⊥ d'affilée ont trouvé un livrable
   établi par le corps et absent des deux côtés (la sonde du seam, la seconde largeur, les deux
   points de S1, la conversion d'unités, la cadence, le balayage lui-même…). Le taux ne descend pas
   parce que rien n'a jamais dérivé le plancher d'une source INDÉPENDANTE de la table.
   ⇒ Ce script est cette source. Il ne lit **que** §0–§8 ; il ne lit **jamais** le §11.

⚠️ CE QU'IL TROUVE : les obligations que le CORPS pose sous une forme reconnaissable — une
   prescription en gras introduite par ⇒, ⛔ ou « RÈGLE », à l'indicatif d'obligation.
⚠️ CE QU'IL NE TROUVE PAS : une obligation posée en prose ordinaire, sans marqueur. **Sa couverture
   est donc PARTIELLE et se lit dans sa sortie** (nombre de candidats retenus / rejetés), jamais
   dans une prose recopiée ailleurs.
⚠️ ET C'EST UN OUTIL DE REVUE, PAS UN VERDICT : il rend une liste de candidats à trancher. Un
   candidat non couvert peut être (a) un vrai livrable manquant, (b) une reformulation d'un
   livrable existant, (c) une règle de méthode qui n'est pas un livrable. **Seule (a) est un
   défaut** — et c'est un humain qui tranche. `--strict` sort 1 s'il reste des candidats.

⛔ IL DÉSIGNE LES CANDIDATS PAR ANCRE ET PAR REPÈRE COURT, jamais en recopiant leur texte : coller
   la sortie d'un contrôle dans un rapport ferait du rapport un producteur de plus (socle §7).
"""
import pathlib, re, sys, unicodedata

path = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'Tools/redimensionnement-design.md'
strict = '--strict' in sys.argv
t = pathlib.Path(path).read_text(encoding='utf-8')

# ── LE CORPS SEUL. Une borne de fin manquante doit SORTIR EN ERREUR, jamais réduire la portée en
#    silence : un balayage sur un corps tronqué rend « aucun candidat » et ressemble à un succès.
if '## 11.' not in t:
    print('⛔ §11 introuvable — impossible de borner le corps'); sys.exit(2)
corps = t.split('## 11.')[0]
if len(corps) < 0.3 * len(t):
    print(f'⛔ corps suspect : {len(corps)} caractères pour un document de {len(t)} — borne douteuse')
    sys.exit(2)

def circ(c):
    try: n = unicodedata.name(c)
    except ValueError: return False
    return n.startswith(('CIRCLED DIGIT', 'CIRCLED NUMBER'))

# ── LES CANDIDATS : une prescription du corps est une phrase en GRAS introduite par un marqueur
#    d'obligation. Le motif est délibérément LARGE (il sur-produit) : un candidat de trop se
#    tranche en revue, un candidat manquant est exactement le défaut qu'on cherche.
MARQUEURS = ('⇒', '⛔', 'RÈGLE', 'OBLIGATION')
cands = []
for m in re.finditer(r'\*\*([^*\n][^*]{18,220})\*\*', corps):
    debut = corps.rfind('\n', 0, m.start())
    ligne_avant = corps[max(0, debut - 200):m.start()]
    if not any(k in ligne_avant for k in MARQUEURS): continue
    txt = re.sub(r'\s+', ' ', m.group(1)).strip()
    # une prescription porte un verbe d'obligation ou un impératif — pas un simple constat
    if not re.search(r'\b(doit|doivent|jamais|toujours|obligatoire|exige|impose|ne \w+ (?:pas|plus)|'
                     r'écrire|publier|déclarer|mesurer|re-mesurer|énumérer|commiter|imprimer|couvrir|'
                     r'asserter|relancer|choisir|dériver|nommer)\b', txt, re.I): continue
    sec = corps.rfind('\n## ', 0, m.start())
    ancre = re.sub(r'\s+', ' ', corps[sec+4:corps.find('\n', sec+4)]).strip()[:26] if sec > 0 else '(avant §0)'
    cands.append((ancre, txt))

# ── LA TABLE, lue SÉPARÉMENT et seulement pour la comparaison finale.
tbl = t.split('## 11.')[1]
enum_txt = tbl[tbl.index('| # | ancre du corps'):]
mots_table = set(re.sub(r'[^a-zà-ÿ0-9 ]', '', re.sub(r'\s+', ' ', enum_txt.lower())).split())

def couvert(txt):
    """Un candidat est COUVERT si l'essentiel de son vocabulaire porteur vit déjà dans la table."""
    w = [x for x in re.sub(r'[^a-zà-ÿ0-9 ]', '', txt.lower()).split() if len(x) > 4]
    if not w: return True
    return sum(1 for x in w if x in mots_table) / len(w) >= 0.62

retenus = [(a, x) for a, x in cands if not couvert(x)]

# contrôle POSITIF : le motif doit trouver quelque chose, et la table doit être lisible.
if not cands:
    print('⛔ AUCUN candidat dans le corps — le motif ne mord pas, le balayage n a rien prouvé')
    sys.exit(2)
if len(mots_table) < 100:
    print(f'⛔ table illisible ({len(mots_table)} mots) — la comparaison serait vide et VERTE')
    sys.exit(2)
# contrôle NÉGATIF : un livrable connu de la table DOIT ressortir couvert.
temoin = "publier la table des 30 non joués par un juge"
assert couvert(temoin), 'le critère de couverture ne reconnaît pas un livrable pourtant énuméré'

print(f'  portée ................... §0–§8 ({len(corps)} caractères, le §11 EXCLU)')
print(f'  candidats du corps ....... {len(cands)}')
print(f'  déjà couverts par la table {len(cands) - len(retenus)}')
print(f'  ⇒ À TRANCHER ............. {len(retenus)}\n')
for i, (a, x) in enumerate(retenus, 1):
    print(f'   [{i:2}] {a:26} «{x[:64]}…»')
print(f'\n  ⚠️ Couverture PARTIELLE par construction : seules les prescriptions EN GRAS sous un')
print(f'     marqueur ({"/".join(MARQUEURS)}) sont vues. Une obligation en prose nue échappe.')
print(f'  ⚠️ Un candidat retenu n est PAS un défaut : il peut être une reformulation ou une règle')
print(f'     de méthode. C est une liste de revue — le tri est humain.')
sys.exit(1 if (strict and retenus) else 0)
