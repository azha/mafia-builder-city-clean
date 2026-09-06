#!/usr/bin/env python3
"""TD-612 — l'appariement littéral → token nommé, mesuré une fois pour les douze fichiers.

La garde `LitterauxDeCouleurPlayModeTests` COMPTE les littéraux proches d'un token ; elle ne dit
pas DE QUEL token chacun est proche. Corriger un fichier sans cet appariement, c'est choisir le
token à l'œil sur un nom (« Or » → `accentGold » ?) — et ce dépôt a déjà payé une couleur choisie
au nom : `#d9ab4e` s'appelle « Or » dans quatre écrans et le token qui porte cette valeur est
`hudMoneyUnderlineGold`, pas `accentGold` (qui vaut `#ffd23f`, à 47 de distance).

⚠️ CE QU'IL NE FAIT PAS, et ça compte : il ne dit pas quel token est JUSTE pour l'usage. Il dit
   lequel porte DÉJÀ cette valeur. Un littéral apparié à 0,0 est une recopie à remplacer sans
   débat ; un littéral SANS token proche est un arbitrage de palette, pas une substitution — et
   c'est le juge visuel qui le tranche, jamais ce script.

Sortie : une ligne par littéral, `ligne · littéral · meilleur token · distance · second · distance`.
Le SECOND est imprimé exprès : deux tokens à distance voisine veulent dire que le choix n'est PAS
déterminé par la valeur, et l'appelant doit le savoir avant d'éditer.
"""
import re, sys, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
ASSET = RACINE / "Assets/Resources/DesignTokens.asset"
CHAMP = re.compile(r"^\s{2}(\w+):\s*\{r:\s*([0-9.]+),\s*g:\s*([0-9.]+),\s*b:\s*([0-9.]+),\s*a:\s*([0-9.]+)\}")
# TROIS motifs, pas un — et les deux qui manquaient ont chacun coûté un site réel (2026-09-06) :
# le `#rrggbbaa` (3 recopies avec alpha, invisibles au motif à 6 chiffres) et la balise de texte
# riche `<color=#…>` (1 recopie, invisible parce que le motif exigeait un guillemet collé au dièse).
# ⚠️ Ce fichier et `LitterauxDeCouleurPlayModeTests` doivent porter LES MÊMES motifs : un
#    instrument qui balaie une population plus étroite que la garde fait déclarer « corrigé » un
#    fichier que la garde verra encore rouge — c'est exactement ce qui est arrivé ici.
HEX = re.compile(r'"#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?"')
RICH = re.compile(r'<color=#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?>')
NEWCOLOR = re.compile(r"new\s+Color\(\s*([0-9]*\.?[0-9]+)f?\s*,\s*([0-9]*\.?[0-9]+)f?\s*,\s*([0-9]*\.?[0-9]+)f?\s*[,)]")
COMMENTAIRE = re.compile(r"^\s*(///|//|\*|/\*)")


def tokens():
    """Les tokens, LUS SUR L'ASSET — jamais recopiés. Un nom recopié dérive en silence."""
    out = {}
    for ligne in ASSET.read_text(encoding="utf-8").splitlines():
        m = CHAMP.match(ligne)
        if m:
            out[m.group(1)] = tuple(round(float(m.group(i)) * 255) for i in (2, 3, 4))
    return out


def litteraux(chemin):
    """MÊME découpage que la garde : deux formes, commentaires exclus. Un instrument qui ne
    balaie pas la même population que la garde rendrait un appariement incomplet — et le
    fichier « corrigé » resterait rouge sur les sites que l'instrument n'a pas vus."""
    out = []
    for i, l in enumerate(chemin.read_text(encoding="utf-8").splitlines(), 1):
        if COMMENTAIRE.match(l):
            continue
        for regex in (HEX, RICH):
            for m in regex.finditer(l):
                h = m.group(1)
                out.append((i, m.group(0), tuple(int(h[j:j + 2], 16) for j in (0, 2, 4))))
        for m in NEWCOLOR.finditer(l):
            v = [float(m.group(k)) for k in (1, 2, 3)]
            if any(x > 1.0 for x in v):
                continue
            out.append((i, m.group(0), tuple(round(x * 255) for x in v)))
    return out


def main():
    if len(sys.argv) < 2:
        print("usage: apparier-litteraux-aux-tokens.py <fichier.cs> [...]", file=sys.stderr)
        return 2
    tk = tokens()
    if len(tk) < 50:
        print(f"REFUS : {len(tk)} tokens lus sur l'asset — le motif ne mord plus, "
              "un appariement sur une palette tronquée serait faux dans le bon sens.", file=sys.stderr)
        return 2
    print(f"palette : {len(tk)} tokens lus sur {ASSET.name}")
    args = sys.argv[1:]
    if args and args[0] == "--bilan":
        # Le DÉNOMINATEUR, pour que « N corrigés » se lise contre un total et non contre rien.
        racine = RACINE / (args[1] if len(args) > 1 else "Assets/Scripts")
        tot = proches = 0
        f_tot, f_proches = set(), set()
        par_token = {}
        for c in sorted(racine.rglob("*.cs")):
            for ligne, src, val in litteraux(c):
                tot += 1
                f_tot.add(c)
                d1, n1 = sorted(((sum((a - b) ** 2 for a, b in zip(val, v)) ** 0.5, n)
                                 for n, v in tk.items()))[0]
                if d1 < 4.0:
                    proches += 1
                    f_proches.add(c)
                    par_token.setdefault(n1, set()).add(c)
        print(f"{tot} littéraux actifs dans {len(f_tot)} fichiers · "
              f"{proches} à moins de 4 d'un token, dans {len(f_proches)} fichiers")
        for n, fs in sorted(par_token.items(), key=lambda x: -len(x[1])):
            print(f"  {len(fs):3} fichier(s)  {n}")
        return 0

    for arg in args:
        p = pathlib.Path(arg)
        if not p.is_absolute():
            p = RACINE / arg
        lits = litteraux(p)
        proches = 0
        try:
            affiche = p.relative_to(RACINE)
        except ValueError:
            affiche = p   # fixture hors dépôt (contrôle) : on ne casse pas, on affiche le chemin nu
        print(f"\n=== {affiche} — {len(lits)} littéral(aux) actif(s)")
        for ligne, src, val in lits:
            dists = sorted(((sum((a - b) ** 2 for a, b in zip(val, v)) ** 0.5), n) for n, v in tk.items())
            d1, n1 = dists[0]
            d2, n2 = dists[1]
            marque = "→" if d1 < 4.0 else " "
            if d1 < 4.0:
                proches += 1
            print(f" {marque} L{ligne:<5} {src:<28} {n1:<28} {d1:6.2f}   (2e {n2} {d2:.1f})")
        print(f"    {proches} littéral(aux) à moins de 4 d'un token — ce sont les recopies.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
