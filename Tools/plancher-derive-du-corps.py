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

# ⛔⛔ L'OBSERVABLE QUI REND LE RATIO NON DÉCISIF (BLOCKING B1, revue ⊥ du 2026-09-01).
#    La v1 décidait par un ratio de vocabulaire à 0,62 — un seuil choisi, non dérivé, sans coude
#    dans sa courbe, et qui déclarait « couvertes » 3 obligations réelles sur 7 (dont une à 1,000).
#    Pire : la liste de verbes en amont étranglait le §6 à ZÉRO candidat, alors que le §6 possède
#    DIX des 31 lignes du plancher — **un tiers du plancher était structurellement hors de portée**,
#    et la sortie n'imprimait que des totaux globaux, donc rien ne le disait.
#    ⇒ Le § est DÉJÀ calculé des deux côtés : sur les candidats (ancre de section) et sur chaque
#    ligne de table (colonne 2). **Un compte par §, sans lexing ni seuil, publie la PORTÉE RÉELLE
#    du balayage** — ce qu'aucun ratio ne fait. Il ne remplace pas le tri, il le rend honnête.
import collections

def cle_section(brut):
    """Ramène les DEUX côtés à la même clé — sinon la comparaison est vide et UNIFORME.

    ⚠️ Piège rencontré en écrivant ce contrôle : les candidats portent le titre du corps
    (« 3. La reconstruction — … ») et la table porte « §3 ». Aucun ne matche l'autre ⇒ TOUTES les
    sections ressortaient « muettes », un verdict d'apparence catastrophique et entièrement faux.
    *Un instrument qui rend un résultat UNIFORME mesure autre chose que ce qu'on croit.*
    """
    m = re.search(r'(\d+(?:\.\d+)?)', brut or '')
    return f'§{m.group(1)}' if m else '(hors §)'

lignes_par_section = collections.Counter(
    cle_section(m.group(1)) for m in re.finditer(r'^\| [0-9]+ \| (§[^|]*) \|', enum_txt, re.M))
mots_table = set(re.sub(r'[^a-zà-ÿ0-9 ]', '', re.sub(r'\s+', ' ', enum_txt.lower())).split())

def couvert(txt):
    """Un candidat est COUVERT si l'essentiel de son vocabulaire porteur vit déjà dans la table."""
    w = [x for x in re.sub(r'[^a-zà-ÿ0-9 ]', '', txt.lower()).split() if len(x) > 4]
    if not w: return True
    return sum(1 for x in w if x in mots_table) / len(w) >= 0.62

# ⛔ m1 : le ratio de vocabulaire porte sur la table ENTIÈRE, donc il déclarait « couvert » un
#    candidat venu d'une section qui n'a AUCUNE ligne de plancher — un mot commun ailleurs suffit.
#    L'observable qui le réfute est déjà calculé (`lignes_par_section`) : une section sans ligne
#    ne peut couvrir personne. Le compte de section PRIME sur le ratio.
retenus = [(a, x) for a, x in cands
           if not couvert(x) or lignes_par_section.get(cle_section(a), 0) == 0]

# contrôle POSITIF : le motif doit trouver quelque chose, et la table doit être lisible.
if not cands:
    print('⛔ AUCUN candidat dans le corps — le motif ne mord pas, le balayage n a rien prouvé')
    sys.exit(2)
if len(mots_table) < 100:
    print(f'⛔ table illisible ({len(mots_table)} mots) — la comparaison serait vide et VERTE')
    sys.exit(2)
# ⛔ CONTRÔLES SUR FIXTURES INERTES, DANS LES DEUX SENS (BLOCKING B1-c). La v1 assertait qu'un
#    libellé VIVANT du document ressortait « couvert » — et il le restait après RETRAIT de sa ligne
#    de la table : il ne testait pas l'énumération, il testait que trois mots existent quelque part
#    dans dix kilo-octets de prose. *Une garde qui certifie le défaut.* ⇒ Deux fixtures embarquées,
#    l'une dont le vocabulaire est dans la table, l'autre garantie étrangère.
_MOTS_TABLE = [w for w in sorted(mots_table) if len(w) > 4][:12]
if len(_MOTS_TABLE) < 8:
    print('⛔ table trop pauvre pour construire un contrôle — abandon'); sys.exit(2)
_FIXT_COUVERTE = ' '.join(_MOTS_TABLE)
_FIXT_ETRANGERE = 'xyzzy plugh frobnitz quuxly blorptastic zorkmid grueish thaumaturgy'
if not couvert(_FIXT_COUVERTE):
    print('⛔ CONTRÔLE POSITIF MUET : du vocabulaire pris DANS la table est classé non couvert.'); sys.exit(2)
if couvert(_FIXT_ETRANGERE):
    print('⛔ CONTRÔLE NÉGATIF ROUGE : du vocabulaire étranger est classé couvert.'); sys.exit(2)

par_section = collections.Counter(cle_section(a) for a, _ in cands)
# contrôle : les deux côtés doivent parler le même alphabet de clés, sinon la comparaison est vide.
if not (set(par_section) & set(lignes_par_section)):
    print('⛔ AUCUNE clé de section commune aux deux côtés — la comparaison serait UNIFORME et fausse.')
    sys.exit(2)
# ⛔ LA PORTÉE EST DÉRIVÉE, PLUS ÉCRITE EN DUR (IMPORTANT I1, revue ⊥ du 2026-09-01). La v1
#    imprimait une borne haute FAUSSE — et son propre run la contredisait six lignes plus bas, en
#    listant des candidats venus de sections au-delà. La ligne de portée était à 0 delta pendant
#    que le correctif ajoutait la table par section juste EN DESSOUS : *le texte que la correction
#    devait rouvrir se trouvait à six lignes du curseur.*
_secs = sorted({int(m.group(1)) for m in re.finditer(r'^## (\d+)\.', corps, re.M)})
_portee = f'§{_secs[0]}–§{_secs[-1]}' if _secs else '(aucune section détectée)'
print(f'  portée ................... {_portee} dérivée ({len(corps)} caractères, le §11 EXCLU)')
print(f'  candidats du corps ....... {len(cands)}')
print(f'  déjà couverts par la table {len(cands) - len(retenus)}')
print(f'  ⇒ À TRANCHER ............. {len(retenus)}\n')
print('  ⇒ PORTÉE RÉELLE, PAR SECTION — c est ici que se lit ce que le balayage NE VOIT PAS :')
print(f'      {"section du corps":30} {"candidats":>10} {"lignes de table":>16}')
muettes = []
def tri(k):
    m = re.match(r'§(\d+)(?:\.(\d+))?', k)
    return (int(m.group(1)), int(m.group(2) or 0)) if m else (999, 0)
for sec in sorted(set(par_section) | set(lignes_par_section), key=tri):
    nc = par_section.get(sec, 0)
    nt = lignes_par_section.get(sec, 0)
    marque = ''
    if sec == '§11':
        # le §11 est retiré du corps en tête de script : le compter comme angle mort serait
        # TAUTOLOGIQUE et rendrait le chiffre de cécité non opposable (IMPORTANT I2).
        marque = '  (exclu par construction — pas un angle mort)'
    elif nc == 0 and nt > 0:
        marque = '  ⛔ MUETTE — le balayage ne peut RIEN y trouver'; muettes.append((sec, nt))
    elif nc > 0 and nt == 0:
        # m2 : c'est ICI qu'un orphelin est le plus probable — des obligations dans le corps, zéro
        # ligne de plancher en face. L'instrument ne tranche pas, il DÉSIGNE.
        marque = '  ⚠️ candidats SANS ligne de plancher — à regarder en premier'
    print(f'      {sec[:30]:30} {nc:>10} {nt:>16}{marque}')
if muettes:
    perdu = sum(n for _, n in muettes)
    print(f'\n  ⛔ {len(muettes)} section(s) MUETTE(s) portant {perdu} ligne(s) de plancher : le balayage')
    print('     est aveugle sur cette part. Ce n est PAS « aucun orphelin » — c est « non regardé ».\n')
for i, (a, x) in enumerate(retenus, 1):
    print(f'   [{i:2}] {a:26} «{x[:64]}…»')
print(f'\n  ⚠️ Couverture PARTIELLE par construction : seules les prescriptions EN GRAS sous un')
print(f'     marqueur ({"/".join(MARQUEURS)}) sont vues. Une obligation en prose nue échappe.')
print(f'  ⚠️ Un candidat retenu n est PAS un défaut : il peut être une reformulation ou une règle')
print(f'     de méthode. C est une liste de revue — le tri est humain.')
sys.exit(1 if (strict and retenus) else 0)
