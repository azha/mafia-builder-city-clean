#!/usr/bin/env python3
"""Extrait la POPULATION des chaînes réellement affichées au joueur par le client Unity.

⛔ CE QUE CET OUTIL EST, ET CE QU'IL N'EST PAS. Il EXTRAIT. Il ne CLASSE pas.
« Cette phrase parle-t-elle du SYSTÈME au lieu de parler AU joueur ? » est un jugement
de langue qui ne se met pas en motif. Extraire et filtrer dans la même passe interdit de
savoir laquelle des deux a menti.

⛔⛔ LA PREMIÈRE VERSION BALAYAIT SUR DES NOMS, ET SON CONTRÔLE POSITIF L'A TUÉE.
Elle énumérait trois noms de seam (`NewText`, `NouveauTexte`, `NouveauTexteFiche`) parce
que ce sont les trois que j'avais vus. Elle rendait 515 chaînes — un chiffre plausible.
`SellingScreenController` appelle le sien `Texte(parent, nom, valeur, …)` : QUATRE chaînes
sur cinq dont je SAVAIS qu'elles sont à l'écran étaient absentes de la population.
⇒ Une liste de noms ne balaie pas une classe, elle balaie ce que son auteur a rencontré.

⇒ LA VERSION QUI TIENT DÉRIVE LES SEAMS PAR LEUR PROPRIÉTÉ, PAS PAR LEUR NOM :
  est un seam de texte joueur toute méthode dont le CORPS affecte un de ses PARAMÈTRES
  à un `.text` — puis, par point fixe, toute méthode qui passe un de ses paramètres à
  l'argument-texte d'un seam déjà connu.
Le nom du paramètre n'entre pas dans le critère (`value`, `texte`, `valeur`, `initial`,
`libelle` coexistent ici) ; seule compte la CHAÎNE D'AFFECTATION jusqu'au `.text`.

⛔⛔ ET LA v2 ACCUSAIT ENCORE À TORT, POUR LA RAISON EXACTEMENT INVERSE.
Elle tenait un paramètre pour du texte joueur dès qu'il APPARAISSAIT dans le membre droit
d'un `.text =`. Or `MajVerdict("indeterminate")` fait `titre.text = CoherencePhrase(cue)` :
`cue` est une CLÉ DE DOMAINE que le résolveur TRADUIT — le mot « indeterminate » n'atteint
jamais l'écran, c'est « Vous vous y tenez » qui s'affiche. Accuser ces trois-là, c'était
reprocher à un écran un anglicisme qu'il ne montre pas.
⇒ « le paramètre apparaît dans le membre droit » n'est pas « le paramètre EST le texte ».
⇒ DISCRIMINANT STRUCTUREL, et il ne demande aucune liste de noms : une fonction est
  TRAVERSANTE si l'un de ses `return` CONTIENT son paramètre (`Lib(s) => Libelle.De(d,r,s)`),
  et c'est une TRADUCTRICE sinon (`CoherencePhrase(cue) => return "Vous vous y tenez";`).
  Le littéral passé à une traductrice est une CLÉ, pas une phrase : il sort de la population.

⛔ LE NOM DE GAMEOBJECT EST LE PIÈGE PRINCIPAL. `Texte(parent, "SousTitre", "…")` : le 2e
argument est un nom d'objet de scène, invisible au joueur, technique et souvent anglais.
Le ramasser gonflerait la population d'« accusés » qui ne s'adressent à personne.
La dérivation structurelle l'exclut par construction : `nom` n'atteint jamais un `.text`.
"""
import re, sys, json, pathlib, argparse

# --------------------------------------------------------------------------- lexing

def sans_commentaires(s):
    """Retire commentaires et directives. Un littéral en commentaire n'atteint personne —
    et le socle a payé deux fois qu'un contrôle qui lit la prose se satisfait ou se
    déclenche tout seul. Les positions sont PRÉSERVÉES (blancs de même longueur)."""
    out, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        if c == '"':
            j = avancer_chaine(s, i)
            out.append(s[i:j]); i = j; continue
        if c == "'":
            j = i+1
            while j < n and s[j] != "'":
                j += 2 if s[j] == '\\' else 1
            out.append(s[i:j+1]); i = j+1; continue
        if s.startswith('//', i):
            j = s.find('\n', i); j = n if j < 0 else j
            out.append(' ' * (j-i)); i = j; continue
        if s.startswith('/*', i):
            j = s.find('*/', i); j = n if j < 0 else j+2
            out.append(re.sub(r'[^\n]', ' ', s[i:j])); i = j; continue
        out.append(c); i += 1
    return ''.join(out)


def avancer_chaine(s, i):
    """Index juste après le littéral qui commence en `i` (verbatim et interpolé compris)."""
    n = len(s)
    verbatim = i >= 1 and s[i-1] == '@' or (i >= 2 and s[i-2:i] in ('@$', '$@'))
    j = i + 1
    while j < n:
        if verbatim:
            if s[j] == '"':
                if j+1 < n and s[j+1] == '"': j += 2; continue
                return j+1
            j += 1
        else:
            if s[j] == '\\': j += 2; continue
            if s[j] == '"': return j+1
            if s[j] == '\n': return j
            j += 1
    return n


def fin_parenthese(s, i):
    """Index de la parenthèse fermante appariée à celle en `i` (chaînes ignorées)."""
    depth, n = 0, len(s)
    while i < n:
        c = s[i]
        if c == '"': i = avancer_chaine(s, i); continue
        if c == '(': depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0: return i
        i += 1
    return n


def fin_accolade(s, i):
    depth, n = 0, len(s)
    while i < n:
        c = s[i]
        if c == '"': i = avancer_chaine(s, i); continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return i
        i += 1
    return n


def decouper_args(s):
    """Découpe une liste d'arguments à la virgule de PROFONDEUR ZÉRO."""
    args, depth, cur, i, n = [], 0, [], 0, len(s)
    while i < n:
        c = s[i]
        if c == '"':
            j = avancer_chaine(s, i); cur.append(s[i:j]); i = j; continue
        if c in '([{': depth += 1
        elif c in ')]}' and depth > 0: depth -= 1
        if c == ',' and depth == 0:
            args.append(''.join(cur)); cur = []; i += 1; continue
        cur.append(c); i += 1
    if ''.join(cur).strip() or args: args.append(''.join(cur))
    return args


# ------------------------------------------------------------------ méthodes du fichier

DECL = re.compile(r'(?:^|[;{}\n])\s*(?:\[[^\]]*\]\s*)*'
                  r'(?:(?:public|private|protected|internal|static|virtual|override|sealed|async|extern|new|partial|unsafe)\s+)+'
                  r'[A-Za-z_][\w.<>\[\],\s]*?\s+([A-Za-z_]\w*)\s*\(')


def methodes(src):
    """(nom, [params], corps, ligne) pour chaque méthode À CORPS du fichier."""
    out = []
    for m in DECL.finditer(src):
        nom = m.group(1)
        po = src.find('(', m.end()-1)
        pc = fin_parenthese(src, po)
        params = [p.strip() for p in decouper_args(src[po+1:pc])]
        k = pc + 1
        while k < len(src) and src[k] in ' \t\r\n': k += 1
        if k >= len(src) or src[k] != '{':
            continue                      # signature d'interface, propriété, expression-bodied
        corps = src[k:fin_accolade(src, k)+1]
        out.append((nom, params, corps, src.count('\n', 0, m.start()) + 1))
    return out


def nom_param(p):
    p = p.split('=')[0].strip()
    mm = re.search(r'([A-Za-z_]\w*)\s*$', p)
    return mm.group(1) if mm else None


# ------------------------------------------------------- dérivation des seams par POINT FIXE

def seams_du_fichier(src, meths, passe):
    """nom de méthode -> ensemble d'index 1-based de ses paramètres de TEXTE JOUEUR.

    Amorce  : le paramètre est affecté à un `.text` dans le corps.
    Point fixe : le paramètre est passé à l'argument-texte d'un seam déjà connu.
    """
    seams = {}
    for nom, params, corps, _ in meths:
        idx = set()
        for k, p in enumerate(params):
            v = nom_param(p)
            if not v: continue
            for mm in re.finditer(r'\.text\s*=([^=][^;]*);', corps):
                # ⛔ Le membre droit est d'abord DÉPOUILLÉ de ses appels traducteurs : sans ça,
                # `titre.text = CoherencePhrase(cue)` ferait de `cue` un texte joueur.
                if re.search(r'\b' + re.escape(v) + r'\b',
                             hors_traductrice(mm.group(1), passe, False)):
                    idx.add(k+1); break
        if idx: seams[nom] = seams.get(nom, set()) | idx
    change = True
    while change:
        change = False
        for nom, params, corps, _ in meths:
            for k, p in enumerate(params):
                v = nom_param(p)
                if not v or (k+1) in seams.get(nom, set()): continue
                for sn, sidx in list(seams.items()):
                    for mm in re.finditer(r'(?<![\w.])' + re.escape(sn) + r'\s*\(', corps):
                        args = decouper_args(corps[mm.end():fin_parenthese(corps, mm.end()-1)])
                        for i3 in sidx:
                            if len(args) >= i3 and re.search(r'\b' + re.escape(v) + r'\b', args[i3-1]):
                                seams.setdefault(nom, set()).add(k+1); change = True
    return seams


# --------------------------------------------------- traversantes vs traductrices

def traversantes(meths):
    """Noms de méthodes qui RENDENT leur paramètre (donc le littéral passé est affiché).
    Une méthode dont aucun `return` ne cite son paramètre le TRADUIT : son argument est
    une clé de domaine, jamais une phrase joueur."""
    ok = set()
    for nom, params, corps, _ in meths:
        noms = {nom_param(p) for p in params if nom_param(p)}
        if not noms: continue
        for m in re.finditer(r'\breturn\b([^;]*);', corps):
            if any(re.search(r'\b' + re.escape(v) + r'\b', m.group(1)) for v in noms):
                ok.add(nom); break
    return ok


# ⛔ Le nom peut être QUALIFIÉ : `ReputationResolvers.CoherencePhrase(cue)`. Un motif qui
# refuse le point (`(?<![\w.])`) ne voit pas l'appel, donc ne neutralise rien, et les trois
# clés de domaine de ⑨ revenaient dans la population — le contrôle négatif l'a dit trois fois.
APPEL = re.compile(r'(?<![\w.])([A-Za-z_][\w.]*)\s*\(')


def masquer_litteraux(expr):
    """Copie de `expr` où le CONTENU des littéraux est remplacé par des espaces, positions
    préservées. ⛔ Sans ce masque, `$"Heat: Unavailable ({raison})"` fait matcher un appel
    nommé `Unavailable` À L'INTÉRIEUR de la chaîne : le neutraliseur effaçait alors
    l'interpolation, et `fetch failed` — bel et bien affiché — sortait de la population.
    Un faux NÉGATIF, donc silencieux : la chaîne manque, rien ne le dit."""
    out, i, n = [], 0, len(expr)
    while i < n:
        if expr[i] == '"':
            j = avancer_chaine(expr, i)
            out.append('"' + ' ' * max(0, j - i - 2) + ('"' if j - i >= 2 else ''))
            out.append(' ' * (j - i - len(''.join(out[-1:]))) if False else '')
            k = len(''.join(out))
            i = j; continue
        out.append(expr[i]); i += 1
    r = ''.join(out)
    return r + ' ' * (len(expr) - len(r)) if len(r) < len(expr) else r[:len(expr)]


def hors_traductrice(expr, passe, seulement_si_litteral=True):
    """Neutralise les appels à une fonction NON traversante.
    `Lib("…")` est conservé ; `CoherencePhrase("aligned")` est effacé.
    `seulement_si_litteral=False` sert à la DÉTECTION DE SEAM, où l'argument est une
    variable et non un littéral (`titre.text = CoherencePhrase(cue)`)."""
    while True:
        for m in APPEL.finditer(masquer_litteraux(expr)):
            nom = m.group(1).split('.')[-1]
            if nom in passe or nom in MOTS_CLES:
                continue
            fin = fin_parenthese(expr, m.end()-1)
            if seulement_si_litteral and '"' not in expr[m.end():fin]:
                continue
            expr = expr[:m.start()] + ' ' * (fin + 1 - m.start()) + expr[fin+1:]
            break
        else:
            return expr


MOTS_CLES = {'if', 'while', 'for', 'foreach', 'switch', 'return', 'lock', 'using', 'catch',
             'nameof', 'typeof', 'sizeof', 'checked', 'unchecked'}


# ------------------------------------------------------------------------ extraction

LITTERAL = re.compile(r'@?\$?"((?:[^"\\\n]|\\.)*)"')


def litteraux(expr):
    """Littéraux d'une expression, en DESCENDANT `Libelle.De(dom, role, "…")` : ses
    arguments 1 et 2 sont des CLÉS techniques, jamais du texte joueur."""
    out = []
    while True:
        m = re.search(r'\bLibelle\.De\s*\(', expr)
        if not m: break
        fin = fin_parenthese(expr, m.end()-1)
        args = decouper_args(expr[m.end():fin])
        if len(args) >= 3:
            out += [x.group(1) for x in LITTERAL.finditer(args[2])]
        expr = expr[:m.start()] + ' ' * (fin + 1 - m.start()) + expr[fin+1:]
    out += [m.group(1) for m in LITTERAL.finditer(expr)]
    return out


def balayer(racine):
    pop, stats = [], {'fichiers': 0, 'seams': 0, 'noms_de_seam': {}}
    # ⛔ PASSE 1 — le set des TRAVERSANTES est GLOBAL, jamais par fichier : `Lib` est souvent
    # défini dans un fichier et appelé dans un autre. Un set par fichier effacerait les appels
    # traversants venus d'ailleurs, donc perdrait des phrases joueur en silence — un faux
    # NÉGATIF, celui que le contrôle positif existe pour attraper.
    fichiers = sorted(pathlib.Path(racine).rglob('*.cs'))
    sources = {f: sans_commentaires(f.read_text(encoding='utf-8', errors='replace'))
               for f in fichiers}
    meths_par_fichier = {f: methodes(s) for f, s in sources.items()}
    passe = {'Lib', 'De'}
    for m in meths_par_fichier.values():
        passe |= traversantes(m)
    # PASSE 2 — extraction
    for p in fichiers:
        src = sources[p]
        meths = meths_par_fichier[p]
        seams = seams_du_fichier(src, meths, passe)
        stats['fichiers'] += 1
        stats['seams'] += len(seams)
        for sn in seams: stats['noms_de_seam'][sn] = stats['noms_de_seam'].get(sn, 0) + 1

        def pousser(ligne, via, expr):
            for lit in litteraux(hors_traductrice(expr, passe)):
                pop.append({'fichier': str(p), 'ligne': ligne, 'via': via, 'texte': lit})

        for sn, sidx in seams.items():
            for m in re.finditer(r'(?<![\w.])' + re.escape(sn) + r'\s*\(', src):
                args = decouper_args(src[m.end():fin_parenthese(src, m.end()-1)])
                ligne = src.count('\n', 0, m.start()) + 1
                for i3 in sidx:
                    if len(args) >= i3:
                        pousser(ligne, f'{sn}#{i3}', args[i3-1])
        for m in re.finditer(r'\.text\s*=\s*([^;]+);', src):
            pousser(src.count('\n', 0, m.start()) + 1, '.text=', m.group(1))
        for m in re.finditer(r'\bLibelle\.De\s*\(', src):
            args = decouper_args(src[m.end():fin_parenthese(src, m.end()-1)])
            if len(args) >= 3:
                ligne = src.count('\n', 0, m.start()) + 1
                for lit in LITTERAL.finditer(args[2]):
                    pop.append({'fichier': str(p), 'ligne': ligne, 'via': 'Libelle.De#3',
                                'texte': lit.group(1)})
    vu, uniq = set(), []
    for e in pop:
        k = (e['fichier'], e['ligne'], e['texte'])
        if k in vu: continue
        vu.add(k); uniq.append(e)
    return uniq, stats


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--racine', default='Assets/Scripts')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--min', type=int, default=0)
    ap.add_argument('--controle', action='store_true',
                    help='exige que des chaînes CONNUES comme joueur soient dans la population')
    a = ap.parse_args()
    pop, stats = balayer(a.racine)
    pop = [e for e in pop if len(e['texte']) >= a.min]
    if a.controle:
        # ⛔ CIBLES INERTES, ET CHOISIES EN LISANT LE CODE — PAS DE MÉMOIRE.
        # La v1 de ce contrôle citait deux phrases que j'avais écrites de mémoire ; elles
        # n'existent NULLE PART dans le dépôt. Le rouge accusait alors ma liste de témoins,
        # pas l'instrument — le plus confortable des faux rouges, puisqu'il donne l'air de
        # bien mesurer. Les cinq ci-dessous ont été LUES à leur ligne, dans quatre écrans et
        # quatre idiomes de seam différents (EcrireTete · `.text =` via Lib() · SetOutcome ·
        # Texte(parent, nom, valeur)).
        temoins = ["Vous avez déjà tranché aujourd'hui",           # Delegation, EcrireTete #1
                   "On ne redessine pas la maison deux fois",      # Delegation, EcrireTete #2
                   "LA CHAÎNE, DE LA TÊTE À LA SORTIE",            # Filiere, .text = Lib(…)
                   "Connectez-vous d'abord.",                      # Lieutenant, SetOutcome
                   "qui vend, et ce qu'il y a dans la caisse"]     # Selling, Texte(…, valeur, …)
        # ⛔ ET LE CONTRÔLE NÉGATIF, qui est le seul à protéger du sens inverse : ces trois
        # chaînes sont des NOMS DE GAMEOBJECT passés en argument 2 des mêmes appels. Un
        # extracteur qui prendrait « l'argument avant le texte » les ramasserait, et la
        # population se remplirait d'accusés qui ne s'adressent à personne.
        intrus = ["SousTitre", "VideIllustration", "Compteurs",   # noms de GameObject
                  "indeterminate", "drifting", "aligned"]         # CLÉS passées à un résolveur
        textes = {e['texte'] for e in pop}
        manquants = [t for t in temoins if not any(t in x for x in textes)]
        faux = [t for t in intrus if t in textes]
        for t in temoins:
            print(('  OK    ' if t not in manquants else '  RATÉ  ') + repr(t), file=sys.stderr)
        for t in intrus:
            print(('  OK    (absent) ' if t not in faux else '  INTRUS ') + repr(t), file=sys.stderr)
        if manquants or faux:
            print(f"CONTRÔLE ROUGE : {len(manquants)} témoin(s) absent(s), {len(faux)} intrus "
                  f"⇒ la population ne décide de rien.", file=sys.stderr)
            sys.exit(1)
        print(f"contrôle VERT : {len(temoins)} témoins présents, {len(intrus)} intrus absents", file=sys.stderr)
    if a.json:
        print(json.dumps(pop, ensure_ascii=False, indent=1))
    else:
        for e in pop:
            print(f"{e['fichier']}:{e['ligne']}\t{e['via']}\t{e['texte']}")
    print(f"--- {len(pop)} chaînes joueur · {stats['fichiers']} fichiers · "
          f"{stats['seams']} seams dérivés ({len(stats['noms_de_seam'])} noms distincts) ---",
          file=sys.stderr)
