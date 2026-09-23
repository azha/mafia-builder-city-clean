#!/usr/bin/env python3
"""§F-3 — les clés que le CLIENT demandera réellement au bundle, dérivées comme il les dérive.

⛔ POURQUOI UNE DÉRIVATION ET PAS UNE LISTE. Aucune clé n'est écrite en dur côté client :
`Libelle.De(domaine, role, litteral)` la CALCULE (`domaine + "." + role + "." + Slug(litteral)`).
Une liste tenue à la main serait donc fausse au premier libellé retouché — et fausse en
silence, puisque le contrat de `Libelle` est de retomber sur le littéral. *Un client qui
demande une clé absente n'affiche pas d'erreur : il affiche le repli, et tout le monde croit
que ça marche.*

⛔⛔ `Slug` EST RECOPIÉ DEPUIS `Assets/Scripts/I18n/Libelle.cs`, PAS REFORMULÉ. C'est la seule
partie de ce fichier qui n'a pas le droit d'être « équivalente » : si ma normalisation diffère
d'un caractère de la sienne, je produis une liste de clés que le client ne demandera jamais, on
les sert, et le repli continue — un lot back entier livré à côté, avec des comptes verts.
Règle, verbatim : NFD, on jette les marques combinantes, lettres et chiffres en minuscules,
tout le reste devient `_` (jamais deux de suite), on rogne les `_` aux bords.

⚠️ CE QUE CET OUTIL NE VOIT PAS, ET C'EST DÉCLARÉ PARCE QU'UN ZÉRO S'Y CACHE. Il connaît deux
formes d'appel : `Libelle.De("d", "r", "…")` en direct, et un helper local
`Lib(string litteral) => Libelle.De("d", "r", litteral)` suivi de `Lib("…")`. Un écran qui
poserait ses textes par une TROISIÈME forme (un helper à deux arguments, une table de
correspondance, un `switch` qui renvoie des littéraux) sortirait d'ici avec ZÉRO clé — et un
zéro se lit « rien à demander » alors qu'il veut dire « je ne sais pas regarder ».
⇒ Le compte par fichier est donc imprimé même quand il vaut 0 : un écran connu pour porter du
  texte et qui rend 0 est un TROU D'INSTRUMENT, pas un écran fini. (Mesuré : mon compteur de
  littéraux rend 0/0 sur ㉜, qui en porte des dizaines, parce que ses textes passent par ses
  propres `EcrireTete`/`ConstruireGeste`.)
"""
import re
import sys
import unicodedata
from pathlib import Path

# ── `Libelle.Slug`, recopié — voir l'en-tête. Ne pas « simplifier ». ─────────────────────
def slug(s: str) -> str:
    out = []
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn':
            continue
        if c.isalnum():
            out.append(c.lower())
        elif out and out[-1] != '_':
            out.append('_')
    return ''.join(out).strip('_')


APPEL_DIRECT = re.compile(
    r'Libelle\.De\(\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"\\]{1,400})"\s*\)')
# le helper local : `private static string Lib(string x) => …Libelle.De("d", "r", x);`
HELPER = re.compile(
    r'string\s+(\w+)\s*\(\s*string\s+\w+\s*\)\s*=>\s*[\w.]*Libelle\.De\(\s*"([^"]*)"\s*,\s*"([^"]*)"')
# ⛔ LA TROISIÈME FORME, TROUVÉE PARCE QUE L'OUTIL IMPRIMAIT SES ZÉROS. `BuildingCardController`
# emploie un helper à DEUX arguments — `Lib(role, litteral) => Libelle.De("building", role, …)` —
# donc le domaine est fixe et le RÔLE arrive au site d'appel. Sans ce motif, ce fichier sortait
# avec 0 clé alors qu'il en produit, et le lot back aurait servi une liste incomplète sans que
# rien ne rougisse.
# ⇒ *Le zéro imprimé par fichier n'était pas de la décoration : c'est lui qui a désigné le trou.*
#   Un outil qui n'affiche que son total aurait rendu un nombre plus petit, tout aussi plausible.
HELPER2 = re.compile(
    r'string\s+(\w+)\s*\(\s*string\s+\w+\s*,\s*string\s+\w+\s*\)\s*=>\s*'
    r'[\w.]*Libelle\.De\(\s*"([^"]*)"\s*,\s*(\w+)\s*,')


# ⛔⛔ LA CONCATÉNATION SE RECOLLE AVANT TOUTE LECTURE — ET SANS ÇA L'OUTIL PRODUIT DES CLÉS
# QUE LE CLIENT NE DEMANDERA JAMAIS. Mesuré : le client écrit couramment
#     Lib("la route n'a rien rendu. Ce n'est pas « la filière est vide » : c'est « on "
#         + "ne sait pas où elle en est ».")
# Le `+` s'évalue DANS l'appel : `Libelle.De` reçoit la phrase ENTIÈRE et dérive la clé entière.
# Une lecture ligne par ligne ne voit que le PREMIER fragment et fabrique
# `…c_est_on` — une clé tronquée au milieu d'un mot.
# ⇒ J'aurais fait servir par le back une liste dont une partie n'est demandée par personne, ET
#   qui manque les vraies clés. Les comptes auraient été verts des deux côtés.
# ⇒ C'est exactement le mode d'échec que l'en-tête de ce fichier annonce pour `Slug` — sauf que
#   la divergence n'était pas dans la normalisation, mais dans la RECONSTRUCTION DE L'ARGUMENT.
#   *Reproduire la règle ne suffit pas : il faut aussi reproduire ce qu'on lui donne à manger.*
CONCAT = re.compile(r'"([^"\\]*)"\s*\+\s*"([^"\\]*)"', re.S)


# ⛔⛔ TD-694 (2026-09-23) — LES COMMENTAIRES SONT RETIRÉS AVANT TOUTE EXTRACTION, LES CHAÎNES PRÉSERVÉES. Mesuré par le
#    back : cet outil comptait des clés citées SEULEMENT dans un commentaire — `famille.ecran.nom` (FamilleLabels.cs, une
#    note qui explique pourquoi le libellé N'EST PAS keyé) et `famille.mode.mode_inconnu` (LieutenantScreenController.cs,
#    une note sur un repli retiré). Le back devait les exclure nommément. Un commentaire qui DOCUMENTE un appel ne l'est pas ;
#    le compter pousserait à ne plus expliquer. Même règle que le classifieur de TD-576 (v3) : commentaires `//` et `/* */`
#    remplacés par des espaces (sauts de ligne gardés), chaînes "…", @"…" et '…' préservées — `"http://…"` n'est pas un commentaire.
#    Fonction reprise TELLE QUELLE de `Tools/juge-donnees/i18n/orphelines.py` (même dépôt, même besoin).
def sans_commentaires(t: str) -> str:
    """Remplace commentaires par des espaces (sauts de ligne gardés) ; respecte "…", @"…", '…'."""
    o, i, n = [], 0, len(t)
    while i < n:
        c = t[i]; d = t[i + 1] if i + 1 < n else ''
        if c == '/' and d == '/':
            while i < n and t[i] != '\n': o.append(' '); i += 1
        elif c == '/' and d == '*':
            while i < n and not (t[i] == '*' and i + 1 < n and t[i + 1] == '/'):
                o.append('\n' if t[i] == '\n' else ' '); i += 1
            o.append('  '); i += 2
        elif c == '@' and d == '"':
            o.append('@"'); i += 2
            while i < n:
                if t[i] == '"' and i + 1 < n and t[i + 1] == '"': o.append('""'); i += 2; continue
                o.append(t[i]); i += 1
                if t[i - 1] == '"': break
        elif c == '"':
            o.append(c); i += 1
            while i < n and t[i] != '"' and t[i] != '\n':
                if t[i] == '\\': o.append(t[i:i + 2]); i += 2; continue
                o.append(t[i]); i += 1
            if i < n: o.append(t[i]); i += 1
        elif c == "'":
            o.append(c); i += 1
            while i < n and t[i] != "'" and t[i] != '\n':
                if t[i] == '\\': o.append(t[i:i + 2]); i += 2; continue
                o.append(t[i]); i += 1
            if i < n: o.append(t[i]); i += 1
        else:
            o.append(c); i += 1
    return ''.join(o)


def controles() -> list:
    """Les deux moitiés, sur des sources FABRIQUÉES (inertes) : une clé dans une chaîne est VUE, la même dans un commentaire
    ne l'est pas — ni en `//`, ni en `/* */` ; et un `//` DANS une chaîne ne coupe rien."""
    echecs = []
    code = 'var a = Libelle.De("sonde", "bloc", "Vue dans le code");\nvar u = "http://x"; var b = Libelle.De("sonde", "bloc", "Après une url");\n'
    comm = '// Libelle.De("sonde", "bloc", "Cachée en commentaire")\n/* Libelle.De("sonde", "bloc", "Cachée en bloc") */\n'
    vus = {f"{d}.{r}.{slug(l)}" for d, r, l in cles_du_fichier(recoller(sans_commentaires(code + comm)))}
    for k in ("sonde.bloc.vue_dans_le_code", "sonde.bloc.apres_une_url"):
        if k not in vus: echecs.append(f"contrôle POSITIF rouge : « {k} » (dans une chaîne) n'est pas vue")
    for k in ("sonde.bloc.cachee_en_commentaire", "sonde.bloc.cachee_en_bloc"):
        if k in vus: echecs.append(f"contrôle NÉGATIF rouge : « {k} » (dans un commentaire) est comptée")
    return echecs


def recoller(src: str) -> str:
    """`"a" + "b"` → `"ab"`, y compris à cheval sur plusieurs lignes, jusqu'à stabilité."""
    avant = None
    while avant != src:
        avant = src
        src = CONCAT.sub(lambda m: '"' + m.group(1) + m.group(2) + '"', src)
    return src


def cles_du_fichier(src: str):
    """Rend {(domaine, role, litteral)} — la clé se dérive ensuite."""
    trouves = set()
    for m in APPEL_DIRECT.finditer(src):
        trouves.add((m.group(1), m.group(2), m.group(3)))
    for h in HELPER.finditer(src):
        nom, dom, role = h.group(1), h.group(2), h.group(3)
        # ⚠️ On exige le nom EXACT du helper, jamais un `\w+\(` générique : `Lib(` et `Libelle.De(`
        # partagent un préfixe, et un motif large compterait deux fois le même appel.
        appel = re.compile(r'(?<![\w.])' + re.escape(nom) + r'\(\s*(?:\$?)"([^"\\]{1,400})"')
        for m in appel.finditer(src):
            trouves.add((dom, role, m.group(1)))
    for h in HELPER2.finditer(src):
        nom, dom = h.group(1), h.group(2)
        appel = re.compile(r'(?<![\w.])' + re.escape(nom) + r'\(\s*"([^"\\]{1,60})"\s*,\s*(?:\$?)"([^"\\]{1,400})"')
        for m in appel.finditer(src):
            trouves.add((dom, m.group(1), m.group(2)))
    return trouves


def main() -> int:
    echecs = controles()
    if echecs:
        for e in echecs: print("⛔ " + e, file=sys.stderr)
        return 2
    racine = Path(sys.argv[1] if len(sys.argv) > 1 else 'Assets/Scripts')
    detail = '--liste' in sys.argv
    total = {}
    par_fichier = {}
    for f in sorted(racine.rglob('*.cs')):
        src = f.read_text(encoding='utf-8')
        if 'Libelle' not in src:
            continue
        src = recoller(sans_commentaires(src))   # commentaires retirés (TD-694), puis recollage — AVANT toute extraction.
        trouves = cles_du_fichier(src)
        par_fichier[str(f)] = len(trouves)
        for dom, role, lit in trouves:
            total[f"{dom}.{role}.{slug(lit)}"] = lit
    # ⛔⛔ UNE POPULATION VIDE EST UNE ERREUR, JAMAIS UN VERT — défaut mesuré par la session B
    # dans CET outil. Sur un chemin inexistant il rendait `0 clé` et sortait **0** : exactement la
    # même sortie que « tout est déjà servi ». C'est la classe que ce dépôt nomme ailleurs — le run
    # qui n'a jamais démarré ressemble trait pour trait à un run vert — et je l'ai reproduite dans
    # l'instrument que j'écrivais POUR détecter des absences silencieuses.
    # ⇒ Un producteur de liste doit distinguer « je n'ai rien trouvé » de « je n'ai rien REGARDÉ ».
    #   Le second est une panne d'outillage ; le premier, un résultat. Ils ne se ressemblent que
    #   parce que le compte est le même.
    # ⚠️ Le seuil est ZÉRO fichier balayé, pas zéro clé : un arbre réel peut légitimement ne
    #   contenir aucune clé, il ne peut pas ne contenir aucun fichier qui mentionne `Libelle`.
    if not racine.exists():
        print(f"⛔ chemin inexistant : {racine} — RIEN n'a été balayé, ce n'est pas un résultat.",
              file=sys.stderr)
        return 2
    if not par_fichier:
        print(f"⛔ population VIDE sous {racine} : aucun fichier ne mentionne `Libelle`. "
              "Un zéro obtenu ainsi ne dit pas « tout est servi », il dit « je n'ai rien regardé ».",
              file=sys.stderr)
        return 2

    print(f"fichiers qui mentionnent `Libelle` : {len(par_fichier)}")
    for f, n in sorted(par_fichier.items(), key=lambda kv: -kv[1]):
        marque = '  ⚠️ ZÉRO — trou d instrument ou fichier sans littéral' if n == 0 else ''
        print(f"  {n:4d}  {f}{marque}")
    print(f"\nK_client (clés distinctes dérivées) : {len(total)}")
    if detail:
        for cle in sorted(total):
            print(f"  {cle}\t{total[cle]}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
