#!/usr/bin/env python3
"""Quel art de ce dépôt n'atteint AUCUN joueur — et le cliquet qui empêche ce compte de monter.

    python3 Tools/art-sans-consommateur.py            # le bilan, par dossier
    python3 Tools/art-sans-consommateur.py --verifier  # rouge si les orphelins AUGMENTENT
    python3 Tools/art-sans-consommateur.py --lister <dossier>

⛔⛔ CE QUE ÇA MESURE, ET POURQUOI AUCUNE GARDE DE CODE NE PEUT LE VOIR. Un PNG sans
lecteur ne casse rien : il ne compile pas en rouge, ne lève pas d'exception, n'apparaît
dans aucun compteur de test. C'est la forme A (l'écrivain existe, l'appelant manque)
appliquée à l'ART — et elle est strictement invisible tant que personne ne compte.
Mesuré le 2026-09-07 : sur 576 PNG livrés comme assets de jeu, **524 n'ont aucun
consommateur**. De l'art produit, importé, conforme à la palette, que personne ne verra.

⛔ DEUX MÉCANISMES DE MONTAGE, ET N'EN CONNAÎTRE QU'UN FAIT MENTIR L'INSTRUMENT DE
+128 ORPHELINS. C'est arrivé ici, à la première version :
  M1  le GUID du `.meta` est cité dans un asset SÉRIALISÉ (.unity, .prefab, .asset,
      .mat, .controller, .spriteatlas) ou dans ProjectSettings.
  M2  le fichier vit sous un dossier `Resources` (n'importe où sous Assets/) et du C#
      l'atteint par un chemin — littéral OU CONSTRUIT à l'exécution.
Une v1 qui n'avait que M1 classait morts les 3 bustes de lieutenant, qui s'affichent
tous les jours. ⇒ *Un balayage qui rend un chiffre trop gros mesure autre chose.*

⛔ ET LE CHEMIN DE M2 EST SOUVENT UNE `const`, PAS UN LITTÉRAL. La v2, qui ne lisait
que les littéraux passés à `Resources.Load`, déclarait morte la carte de la ville —
chargée par `CheminPeinture`, une constante définie douze lignes plus haut. Les
constantes sont donc résolues avant l'appariement. *Un motif trop étroit rend le
résultat qui arrange.*

⚠️ LA POPULATION EST BORNÉE, ET LA BORNE EST LA MOITIÉ DE LA MESURE. `Assets/Screenshots`
est EXCLU : ce sont des SORTIES de capture, pas des entrées de jeu. Les compter ferait
accuser au hasard — un contrôle dont on ne borne pas la population accuse d'autant plus
qu'on lui fait confiance.

⚠️ CE QUE ÇA NE PROUVE PAS. « Un GUID est cité » ne veut pas dire « un joueur le voit » :
un sprite référencé par un asset qu'aucun écran ne monte reste invisible. Ce compte est
donc un PLANCHER de l'art mort, jamais un plafond. Il attrape la forme la plus grossière —
celle où RIEN ne pointe vers le fichier — et c'est déjà 524.
"""
import os, re, sys, collections

RACINE_EXCLUE = ('Assets/Screenshots',)
SERIALISES = ('.unity', '.prefab', '.asset', '.mat', '.controller', '.spriteatlas')
# ⛔ Cliquet. Ce nombre est une DONNÉE mesurée le 2026-09-07, pas un objectif : il doit
#    DESCENDRE quand on monte de l'art, et il ne doit jamais monter sans qu'on le sache.
#    Une épingle sur une donnée rougit à l'événement ; une prose datée ne rougit jamais.
PLANCHER_2026_09_07 = 510


def guid(meta):
    m = re.search(r'^guid: ([0-9a-f]{32})', open(meta, encoding='utf-8', errors='replace').read(), re.M)
    return m.group(1) if m else None


def mesurer(racine='Assets'):
    pngs = {}
    for r, _, fs in os.walk(racine):
        if r.replace('\\', '/').startswith(RACINE_EXCLUE):
            continue
        for n in fs:
            if not n.endswith('.png'):
                continue
            p = f'{r}/{n}'.replace('\\', '/')
            pngs[p] = guid(p + '.meta') if os.path.exists(p + '.meta') else None

    serial, cs = [], []
    for base in (racine, 'ProjectSettings'):
        for r, _, fs in os.walk(base):
            for n in fs:
                if n.endswith('.meta'):
                    continue
                q = f'{r}/{n}'
                try:
                    t = open(q, encoding='utf-8', errors='replace').read()
                except OSError:
                    continue
                if base == 'ProjectSettings' or n.lower().endswith(SERIALISES):
                    serial.append(t)
                elif n.endswith('.cs'):
                    cs.append(t)
    SER, CS = '\n'.join(serial), '\n'.join(cs)

    # ⛔⛔ M2 NE PEUT PAS SUIVRE LA FORME DE L'APPEL — TROISIÈME ÉLARGISSEMENT, ET LE PLUS
    #    INSTRUCTIF. Les versions précédentes lisaient le littéral passé à `Resources.Load`, puis
    #    aussi les `const` résolues. Le 2026-09-07, un refactor a sorti le mécanisme dans un type
    #    partagé (`FamilleDIcones`) qui reçoit son dossier en ARGUMENT DE CONSTRUCTEUR et appelle
    #    `Resources.Load(champ + clé + suffixe)`. Plus aucun littéral au site d'appel ⇒ l'instrument
    #    a compté 18 icônes MONTÉES, VERTES EN JEU, comme orphelines, et le cliquet a rougi sur un
    #    montage RÉUSSI. *Un détecteur qui suit la FORME de l'appel est battu par le premier
    #    refactor qui la change — et il l'est dans le sens qui accuse.*
    # ⇒ On ne suit donc plus l'appel : on demande si le NOM DU DOSSIER apparaît dans un littéral
    #    C# quelconque. Un dossier sous `Resources` que personne ne nomme nulle part est
    #    injoignable ; un dossier nommé quelque part est joignable par une forme qu'on n'a pas à
    #    énumérer. ⚠️ C'est délibérément PLUS LARGE : ça peut compter joignable un dossier dont le
    #    nom coïncide avec un littéral sans rapport. Le compte penche donc vers « monté », et c'est
    #    le bon sens de l'erreur pour un chiffre qui sert de cliquet — un faux « orphelin » bloque
    #    un lot réussi, un faux « monté » ne fait que sous-estimer la dette, qu'on mesure par
    #    ailleurs.
    litteraux = set(re.findall(r'"([^"\n]{2,120})"', CS))
    chemins = set(re.findall(r'Resources\.Load<[^>]*>\("([^"]*)"', CS))
    consts = dict(re.findall(r'const\s+string\s+(\w+)\s*=\s*"([^"]*)"', CS))
    for ident in re.findall(r'Resources\.Load<[^>]*>\(\s*([A-Za-z_]\w*)\s*[\),+]', CS):
        if ident in consts:
            chemins.add(consts[ident])

    def prefixe(p):
        parts = p.split('/')
        return '/'.join(parts[parts.index('Resources') + 1:-1]) if 'Resources' in parts else None

    cls, det = collections.Counter(), collections.defaultdict(list)
    for p, g in sorted(pngs.items()):
        pre = prefixe(p)
        if g and g in SER:
            c = 'M1 GUID sérialisé'
        elif pre is not None and (
                any(x.rstrip('/') == pre or x.startswith(pre + '/') for x in chemins)
                or any(pre in lit for lit in litteraux)
                or (pre and any(pre.split('/')[-1] in lit for lit in litteraux))):
            c = 'M2 Resources + chemin C#'
        elif pre is not None:
            c = 'M2? sous Resources, chemin C# INTROUVABLE'
        else:
            c = 'ORPHELIN'
        cls[c] += 1
        det[(c, os.path.dirname(p))].append(os.path.basename(p))
    return cls, det, len(pngs)


def main():
    cls, det, tot = mesurer()
    orph = cls['ORPHELIN'] + cls['M2? sous Resources, chemin C# INTROUVABLE']
    if '--lister' in sys.argv:
        cible = sys.argv[sys.argv.index('--lister') + 1]
        for (c, d), l in sorted(det.items()):
            if c.startswith(('ORPHELIN', 'M2?')) and d.startswith(cible):
                for n in l:
                    print(f'{d}/{n}')
        return 0
    print(f"population bornée : {tot} PNG livrés comme assets de jeu "
          f"(exclus : {', '.join(RACINE_EXCLUE)})\n")
    for c, v in sorted(cls.items(), key=lambda x: -x[1]):
        print(f"  {v:5d}  {c}")
    print(f"\n  ⇒ SANS CONSOMMATEUR : {orph}  (plancher du 2026-09-07 : {PLANCHER_2026_09_07})")
    print("\n  par dossier :")
    for (c, d), l in sorted(det.items(), key=lambda x: -len(x[1])):
        if c.startswith(('ORPHELIN', 'M2?')):
            print(f"  {len(l):5d}  {d}")
    if '--verifier' in sys.argv:
        if orph > PLANCHER_2026_09_07:
            print(f"\n⛔ ROUGE : {orph} orphelins contre {PLANCHER_2026_09_07} au plancher — "
                  f"{orph - PLANCHER_2026_09_07} PNG de plus sans lecteur. De l'art vient d'être "
                  "produit sans être branché, ou un consommateur vient de disparaître.")
            return 1
        if orph < PLANCHER_2026_09_07:
            print(f"\n✅ {PLANCHER_2026_09_07 - orph} de moins qu'au plancher — DESCENDRE "
                  f"`PLANCHER_2026_09_07` à {orph} dans ce fichier, sinon le cliquet autorise "
                  "silencieusement le retour en arrière.")
        else:
            print("\n✅ inchangé")
    return 0


if __name__ == '__main__':
    sys.exit(main())
