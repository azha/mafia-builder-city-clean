#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prépare les dossiers de juges du tour du 2026-09-06 (session `mafia-juge`).

Un dossier par écran, rempli d'après `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) :
`Tools/juge-visuel/<dossier>/r<N>-2026-09-06/{dossier.md, reference-*.png, etats/, capture-*.png, mesures/}`
et, pour les écrans SANS rapport `juge-donnees` mode maquette (③ ㊴ ㊵),
`Tools/juge-donnees/<dossier>/maquette-2026-09-06/dossier.md`.

Ce que ce script fige, et pourquoi c'est un script plutôt que dix fichiers écrits à la main :
- l'ÉCHELLE est la même phrase pour tous les écrans de série 6 (mesurée une fois : chrome 392 CSS ↔
  1280 u via `AppShell.Px`, écrans 300 CSS ↔ 1280 u via `EchelleMaquette.LargeurEcransBrennar6`) ;
  une phrase recopiée dix fois diverge, une phrase générée ne diverge pas ;
- les IMAGES sont des liens symboliques vers les fichiers commités (LFS) — pas de copie : une copie
  est une seconde vérité qui ne se périme pas avec la première ;
- `fc-match` est EXÉCUTÉ au moment de la génération, pas recopié d'un dossier précédent.

Les captures ont été prises par une autre session (client `main` 76ee3cc, 2026-09-04 11:22) ; le log
du run n'a pas été préservé, donc les rects imprimés par les tests ne sont PAS disponibles — chaque
dossier le dit, et donne à la place la géométrie DÉRIVÉE du code (CanvasScaler 1280, match 0).
"""
import os, re, subprocess, pathlib, sys, datetime

RACINE = pathlib.Path(__file__).resolve().parents[2]
ATELIER = pathlib.Path('/home/erutheone/project/atelier3d-mafia')
JV = RACINE / 'Tools' / 'juge-visuel'
JD = RACINE / 'Tools' / 'juge-donnees'
DATE = '2026-09-06'
SHA = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=RACINE, capture_output=True, text=True).stdout.strip()
SHA_ATELIER = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ATELIER, capture_output=True, text=True).stdout.strip()

def fc(fam):
    r = subprocess.run(['fc-match', fam], capture_output=True, text=True).stdout.strip()
    return r.split(':')[1].strip() if ':' in r else r

POLICES = {f: fc(f) for f in ['Georgia', 'DejaVu Sans', 'Courier New', 'sans-serif', 'serif', 'Times New Roman', 'Segoe UI']}

def cadres(page):
    """index 0-based → (ligne, étiquette) des `<div class="cadre">` d'une page de l'atelier."""
    out = {}; idx = 0
    for n, l in enumerate((ATELIER / page).read_text(encoding='utf-8').split('\n'), 1):
        for m in re.finditer(r'<div class="cadre">', l):
            et = re.search(r'class="etiquette">([^<]*)<', l[m.end():m.end() + 400])
            out[idx] = (n, et.group(1) if et else '?'); idx += 1
    return out

CADRES = {p: cadres(p) for p in ['ecrans-brennar-6.html', 'ecrans-brennar-4.html']}

CAPTURE_PREFIXES = ('capture', 'planche', 'temoin')

def copier_capture(dst, src, note=''):
    """Amendement de mandat 2026-09-06 (f2) : une capture est une mesure DATÉE — elle se COPIE dans le dossier avec son
    sha256 et le dernier commit qui la touche, jamais liée (un lien résout vers ce que l'arbre porte au moment de la LECTURE)."""
    import hashlib, subprocess
    dst=pathlib.Path(dst); src=pathlib.Path(src); dst.parent.mkdir(parents=True, exist_ok=True)
    data=src.read_bytes(); dst.write_bytes(data); h=hashlib.sha256(data).hexdigest()
    c=subprocess.run(['git','log','-1','--format=%h %cd','--date=iso','--',str(src)],capture_output=True,text=True).stdout.strip() or '?'
    prov=dst.parent/'captures-provenance.md'
    if not prov.exists():
        prov.write_text("# Provenance des captures — COPIES avec empreinte (amendement 2026-09-06 : jamais de lien)\n\n> ⚠️ « dernier commit » = le commit du PNG, PAS le SHA de l'arbre qui l'a rendu (un fichier commité aujourd'hui peut avoir été rendu par un arbre d'hier). L'arbre de rendu n'est connu que si la suite l'imprime (`git rev-parse HEAD` au run — lot Unity) : colonne « arbre de rendu » = « non imprimé » sinon.\n\n| capture | source | dernier commit du PNG | sha256 | arbre de rendu | note |\n|---|---|---|---|---|---|\n",encoding='utf-8')
    with prov.open('a',encoding='utf-8') as f: f.write(f"| `{dst.name}` | `{src}` | `{c}` | `{h[:16]}…` | non imprimé | {note} |\n")
    return h

def lien(dst: pathlib.Path, src: pathlib.Path):
    if pathlib.Path(dst).name.lower().startswith(CAPTURE_PREFIXES):
        raise SystemExit(f"⛔ lien() refusé pour une CAPTURE ({dst}) — utiliser copier_capture() (amendement 2026-09-06)")
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.is_symlink() or dst.exists(): dst.unlink()
    dst.symlink_to(os.path.relpath(src, dst.parent))
    assert dst.exists(), f'lien cassé : {dst} → {src}'

# Liens COMMUNS à tout dossier sous chrome (amendement 2026-09-06 : le canon du HUD porte un nom qui ne collisionne avec aucun
# canon antérieur d'écran — `ecran-canon.png` désigne, dans plusieurs dossiers, un canon de série 2 de l'écran lui-même).
LIENS_COMMUNS = [('hud-canon-1176.png', JV / 'ecran-principal' / 'ecran-canon.png')]

def taille(p):
    from PIL import Image
    return '%d×%d' % Image.open(p).size

# ─────────────────────────────────────────────────────────────────────────────────────────────
POLICES_MD = '\n'.join(f'      {k:<18} →  {v}' for k, v in POLICES.items())

ECHELLE_S6 = f"""## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (cadre de série 6/4, `.tel` 300 CSS) | 1080 | 300 | **×3,6** |
| CAPTURE (contenu de l'écran, dessiné à `LargeurEcransBrennar6 = 300`) | 1080 | 300 | **×3,6** |
| | | **rapport capture ÷ référence** | **1,00** |

- ⇒ Pour le CONTENU de l'écran, référence et capture sont **à la même échelle** : 1 px CSS = 3,6 px des
  deux côtés. Un écart de taille sur le contenu est donc un écart RÉEL, pas un artefact d'instrument.
- ⚠️ **Le CHROME (bandeau haut + dock du bas) n'est PAS à cette échelle.** Il est construit par le shell
  d'après `hud-brennar.html` (`.tel` de **392 CSS**) : `AppShell.Px(css) = css × 1280/392` — soit
  **×2,755 px par px CSS à 1080 de large** (`Assets/Scripts/Shell/AppShell.cs:1583`, `EchelleMaquette.cs:87`).
  Le cadre de série 6 dessine sa propre barre et son propre dock à 300 CSS : ce sont des ÉVOCATIONS du
  chrome, pas le chrome. ⇒ **Le chrome se juge contre le canon du HUD** — dans ce dossier : **`hud-canon-1176.png`** (lien vers
  `Tools/juge-visuel/ecran-principal/ecran-canon.png`, 1176 px = 392 CSS, ×3 ; ⚠️ un fichier `ecran-canon.png` LOCAL, s'il existe,
  est un canon ANTÉRIEUR de l'écran, pas le HUD) **et le contenu contre le cadre de série 6**. Une différence de hauteur de
  bandeau entre le cadre de série 6 et la capture est ASSUMÉE (chrome partagé), pas un défaut de l'écran.
- Hauteurs : référence **584 CSS** (2102 px, `.tel` en 9:17,5) ; capture **666,7 CSS** (2400 px, 9:20).
  La différence (82,7 CSS) est absorbée par la zone de contenu ENTRE le bandeau et le dock : aligne le
  haut du contenu sur le bas du bandeau, et le bas du contenu sur le haut du dock — jamais par le pixel absolu.
- Géométrie de la capture, DÉRIVÉE du code (le log du run n'a pas été préservé, donc **aucun rect imprimé
  n'est fourni**) : `CanvasScaler` 1280 de large, `matchWidthOrHeight = 0` ⇒ canvas **1280 × 2844,4 unités**,
  `scaleFactor = 1080/1280 = 0,84375` (`AppShell.cs:1201-1202`, `:1270` ; même valeur mesurée au tour r8 de
  ㊲ le 2026-08-31). Le bandeau fait 52 CSS-HUD = **143 px** ; le dock, `TabDockHauteurCss` (somme de
  cinq constantes, `AppShell.cs:1547`) — mesure-le sur l'image, ne le déduis pas.
- ⚠️ Ce que la normalisation NE couvre PAS : les rapports INTERNES (un bloc deux fois trop haut par rapport à
  son voisin, une rangée aux tuiles inégales) sont invariants d'échelle et restent des défauts réels.
"""

POLICES_BLOC = f"""- **Polices — ce qui a RÉELLEMENT rendu la référence** (`fc-match` sur cette machine, exécuté à la
  génération de ce dossier le {DATE} ; les références ont été rendues ici le 2026-09-03 par
  `Tools/rendre-tel.py` → Chrome sans tête) :

{POLICES_MD}

  Le client embarque **DejaVu Sans** / **DejaVu Serif** (`DesignTokens.primaryFont` / `hudSerifFont`).
  ⇒ `Georgia` n'a JAMAIS été montrée à personne : un écart de FAMILLE (Noto Serif ↔ DejaVu Serif) ou de
  chasse est un **ARBITRAGE** ; la **hauteur de capitale**, elle, se compare (c'est l'image approuvée).
  ⚠️ **Lis la `font-family` de TA source et applique la table `fc-match` ci-dessus** — ce que la référence a montré
  dépend de la source : SÉRIE 6 (`ecrans-brennar-6.html`) demande `'DejaVu Sans'` (84 règles) ⇒ rendue par DejaVu
  Sans elle-même, référence et client partagent la MÊME police sur le sans-sérif — **mais PAS sur le sérif** : la même source demande
  `Georgia,serif` (69 règles) ⇒ Noto Serif à la référence, DejaVu Serif au client (défaut de dossier attrapé au ㊲ r15 : le bloc ne
  citait que le sans) ; FAMILLE demande
  `"Segoe UI",Roboto,system-ui` ⇒ Noto Sans (écart de chasse = ARBITRAGE, +10 % mesuré par le juge ⑥) ; HUD
  (`hud-brennar.html`) demande `"Segoe UI",Roboto,system-ui,sans-serif` pour le corps ⇒ Noto Sans, et
  `Georgia,"Times New Roman",serif` pour titre, valeurs d'aile, heure, `.heatpct`, `.stats b` ⇒ Noto Serif. Aucune
  comparaison de FAMILLE n'est opposable là où la référence a rendu Noto et le client DejaVu ; la hauteur de capitale, si."""

DOCTRINE = """## Règles de doctrine applicables

- **Portrait, deux résolutions** : le projet vise le téléphone portrait ; la cible est 1080×2400 (20:9).
  ⚠️ Ce tour ne fournit **qu'une résolution** par écran (sauf mention) — à écrire en non-vérifié, pas à deviner.
- **Gouttière** : le contenu d'écran reste dans le rect libre entre bandeau et dock (`ShellChrome.TopInsetPx`
  / `BottomInsetPx`) ; seul le chrome traverse. Tout contenu SOUS le bandeau ou SOUS le dock est un écart.
- **Contraste** : ≥ 3:1 grands textes, ≥ 4,5:1 petits — mesuré sur l'art réel, jamais sur un gris choisi.
- **Langue affichée : français**, via résolveurs nommés (i18n `fr`, bundle de 674 clés au moment des
  captures) — aucun enum brut, aucun repli anglais ne doit atteindre l'écran.
- **Espace de mélange** : la maquette est composée en sRGB par Chrome, le client en LINÉAIRE
  (`m_ActiveColorSpace: 1`) ; un écart SYSTÉMATIQUE de même signe sur plusieurs translucidités est une erreur
  de modèle, pas N erreurs.
- **Animation : AUCUNE sur un nouvel écran** (ruling user 2026-08-27). Aucune paire T/T+1 s n'est fournie ce
  tour : à écrire en non-vérifié.
- **Identité photographiée** (ruling f2 2026-09-06 ~07:20, payé sur ㊵) : une planche prise SANS la paire
  `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` photographie `operational_demo` (repli `[SerializeField]`) et RIEN sur
  l'image ne le dit. Avant de comparer une VALEUR de la planche à un corps `demo_capture`, le dossier doit citer la
  ligne `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` du journal du run (ou son sidecar) ;
  sans elle, la comparaison de valeurs va en « non vérifié » — la forme, elle, se juge.
- **Chrome non alimenté** : si le bandeau de la capture montre des tirets (ARGENT « — », JOUR « — ») ou « Unknown »
  dans le médaillon, la capture a été prise AVANT que le bandeau ne soit alimenté — le rapport le dit en tête et
  **ne juge pas le chrome** (il sera repris) ; le contenu de l'écran, lui, se juge. ⚠️ **Exception mesurée le
  2026-09-06 (f2)** : la PHASE de l'aile droite (« Aube »…) est vidée à chaque activation d'onglet et n'est alimentée
  qu'en district — un tiret « — » à la place de la phase, ARGENT et JOUR étant alimentés, est un ÉTAT VOULU hors ① :
  classe ASSUMÉ, et le reste du chrome SE JUGE.
- **Ronds du dock VIDES (aucune icône)** : le canon HUD pose une icône 20×20 dans chaque rond ; le client n'en pose aucune —
  **ARBITRAGE user connu (« j'aime pas les icônes »)**, jamais un écart d'écran : table ARBITRAGE, une ligne.
- **Cadre de style tranché par l'user (2026-09-06 soir)** : sombre, napolitain, mafieux, ère fin des années 1980 – début 1990.
  Si la maquette et la capture divergent sur la DIRECTION (palette d'ambiance, matière, époque, ton) plutôt que sur la géométrie,
  écris-le comme un **écart de direction = ARBITRAGE**, jamais comme un défaut d'implémentation ; un écart de géométrie, de
  couleur de jeton, de typographie ou d'espacement reste un écart d'écran.
- **Une ligne de journal ne se cite que JOINTE** (fichier dans le dossier). Sinon le dossier écrit « déclaré par la ligne GO, non
  relu » : le 2026-09-06, une ligne `[CHROME-ALIMENTE]` citée « par planche » s'est révélée inexistante dans le client, et l'identité
  n'est imprimée qu'une fois par SUITE à la connexion. Une preuve recopiée d'un message n'est pas une preuve lue.
- **Chaque capture déclare sa CATÉGORIE de suite et son ANGLE MORT** (règle 2026-09-06, ㊲ r13) : une suite qui monte le
  locataire HORS shell (`Screen…`) ne peut pas voir un défaut de chrome ni de placement face au dock ; seule une suite SOUS shell
  (`Capture…`) les exerce. Un défaut de cadre a survécu à plusieurs tours parce que deux instruments indépendants étaient aveugles
  au même endroit : l'orthogonalité des auteurs ne donne pas l'orthogonalité des angles morts, seule la DÉCLARATION la donne.
  ⇒ dans la table des captures, le rôle dit « sous shell / hors shell » et ce que la planche ne peut pas montrer.
- **Deux mesures d'un MÊME objet qui s'écartent dans des sens opposés accusent un REPÈRE, pas une valeur** (correcteur,
  2026-09-07 : ×3,27 puis ÷100 dans la même série — unités de canvas contre unités de maquette). Un écart constant accuse une
  valeur ; un écart qui change de signe et d'ordre accuse une unité. Devant ce motif, ne cherche pas le bon réglage, cherche le bon
  repère, et écris-le. ★ Une garde chiffrée par un nombre mesuré dans le mauvais repère est verte, plausible, et certifie le défaut.
- **Témoin d'ÉTAT du chrome — pour TOUT écran sous shell** : le canon HUD (`hud-canon-1176.png`) est l'état CALME (« 37 % ») ;
  quand le compte est BRÛLANT (médaillon « Brûlant »), la source `hud-brennar.html` porte la variante `.tel.chaud` sur QUATRE règles —
  filet du bandeau `.barre::after` (l. 31), valeur de l'aile droite (l. 41), `.heatpct` (l. 64), boîtier du médaillon (l. 65) — toutes
  en `--braise` (224,102,74). ⇒ Pour ces quatre parties le témoin est la CSS `.chaud`, pas le PNG calme : un filet ou un boîtier
  braise n'est pas un laiton faux (défaut de dossier attrapé au ㊲ r14 : la règle n'était écrite que dans les dossiers ①).
- **L'instrument de capture peut DÉFORMER ce qu'il mesure** (2026-09-07 : `SnapToScreenPixel` arrondit des positions MONDE ; pendant
  la capture 1 unité = 192 px ⇒ cellules, badges, libellés et glyphes du district déplacés jusqu'à ±96 px, et une « maille » à résidu
  0,0 qui n'existait pas). ⇒ Une position suspectement RONDE ou RÉGULIÈRE sur une planche (multiples d'un pas, alignements sans
  raison, entiers trop propres) est d'abord un soupçon sur la CHAÎNE DE CAPTURE, pas sur l'écran : dis-le, mesure le pas et le
  résidu, et mets-le en « non vérifié » avec la mesure hors image (les appelants de `SnapToScreenPixel`). Tant que ce correctif n'est
  pas posé, aucune planche de district prise par cette chaîne ne montre la mise en page réelle.
- **Animation — le mandat est PÉRIMÉ sur ce point** (f2, 07/09 10:40) : « un nouvel écran est SANS animation » cite le ruling de 13h42 du
  27/08, renversé le soir même (« animé le truc, tout en restant dark/mafieux ») ; les animations sont revenues par défaut sur les écrans neufs
  et le poseur du marché EXIGE désormais les `@keyframes`. ⇒ Un mouvement mesuré entre T et T+1 n'est PAS un écart ; une référence rendue à
  t = 0 avec `animation-delay` négatif est un DISPOSITIF de capture voulu (sans lui le trait serait invisible), pas un artefact. Ce qui reste
  jugeable : **où le trait figé tombe** (sur du texte = défaut de CAPTURE, paramètre de délai propre à l'écran → blender ; classe : 9 règles
  `.elast::after` identiques, même délai, sur ≥ 6 écrans — regarde où tombe le trait teal sur ㊳ ㊴ ㊵ ⑯).
- **Un zéro exact au-delà d'une distance dit « rien AU-DELÀ », pas « rien »** (㊲ r15 : `P(2) = 0,02`, `P(d≥3) = 0,00` lus comme
  « aucun pixel » — l'effet existait, plus court que la première distance de la sonde). ⇒ Pour tout halo / lueur / ombre : mesurer
  AUSSI `d = 1` et la luminance BRUTE au bord de l'encre, et écrire la portée (dernier d où l'excès > 0,5) avant de conclure « absent ».
  Une fenêtre d'observation plus large que l'effet rend un zéro parfait qui ressemble à une absence.
- **Libellés anglais dans la RÉFÉRENCE** (`HEAT`, `$ 24 850`…) : ruling user 2026-09-02 « fr réel » — le client a
  raison, la maquette est en retard ; à noter UNE fois comme « maquette à mettre à jour », jamais comme écart d'écran.
- **Or** : s'il diffère, dire dans quel SENS — *plus jaune* (un jeton `accentGold #ffd23f` là où l'art veut
  `hudMoneyGold #f2c96b`) ou *plus gris* (désaturation : alpha, voile, matériau) — ce sont deux causes distinctes.
- **Silhouettes** : ruling DA du 2026-09-02 — plus de chapeaux 1950 (Don nu, lieutenant à capuche, homme à
  casquette). La série 6 porte encore 9 `fedora` et 24 `casquette` : si un buste diffère par le COUVRE-CHEF
  seulement, c'est un ARBITRAGE (la référence est en retard sur le ruling), pas un défaut du client.
"""

def non_fourni(extra=''):
    return f"""## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests — tu constates ce que tu VOIS ;
- les notes d'implémentation du chantier ;
- **les rapports de juges précédents** (`Tools/juge-visuel/<ecran>/r<k>/` pour k < N, et `Tools/juge-donnees/…`) :
  même s'ils existent à côté, ils ne te sont délibérément pas fournis — un juge qui hérite du contexte hérite
  des angles morts ;
- toute capture « avant » ;
- le rect imprimé par le test (log non préservé) — la géométrie ci-dessus est dérivée du code, et tu la
  vérifies sur l'image (largeur du bandeau = 1080, hauteur mesurée) avant de t'en servir ;{extra}
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
"""

FORMAT_RAPPORT = """## Format du RAPPORT — imposé

⛔ Le juge choisit ses catégories et ses instruments ; il ne choisit pas la forme de son verdict. **Un finding
par ligne, dans UNE table, et rien de compté ailleurs** :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \\| `MAJEUR` \\| `MINEUR` | `DÉJÀ APPLIQUÉ` \\| **`NOUVEAU`** | <l'écart> | <les nombres> | <ou vide> |

- **gravité** : liste fermée, trois valeurs, pas de synonyme (ASSUMÉ et ARBITRAGE vont dans des tables À PART,
  jamais comptés avec les findings).
- **critère** : `NOUVEAU` dès que l'instrument ou la grandeur n'existait pas au tour précédent (au premier tour,
  tout est `NOUVEAU`).
- ⛔ **Sépare ce qui dépend des DONNÉES de ce qui dépend de la FORME.** Les planches ont été prises sur le compte
  de démo `operational_demo@example.test` le 2026-09-04 ; ce compte peut avoir été RECRÉÉ depuis (un gate E2E
  le purge). Un écart de contenu (un nom, un compte, une liste plus ou moins longue que la maquette) est une
  observation DATÉE — classe-le dans une colonne `dépend des données : oui/non`, ou dans une table séparée.
  Géométrie, palette, typographie, espacements, rythme sont vrais quelles que soient les données : c'est eux
  qui comptent d'abord.
- Le compte se prend dans la table, jamais dans la synthèse.
"""

# ─────────────────────────────────────────────────────────────────────────────────────────────
def bloc_cadres(page, idx_list, nominal):
    c = CADRES[page]
    lignes = []
    for i in idx_list:
        n, et = c[i]
        lignes.append(f'  - #{i} (l.{n}) — {et}' + ('  ⇐ **cadre NOMINAL, rendu en référence**' if i == nominal else ''))
    return '\n'.join(lignes)

def ecran_md(e):
    refs = '\n'.join(f'| `{r[0]}` | {r[1]} | {r[2]} | {r[3]} | {r[4]} |' for r in e['references'])
    caps = '\n'.join(f'| `{c[0]}` | {c[1]} | {c[2]} | {c[3]} | `{c[4]}` |' for c in e['captures'])
    etats = e.get('etats_md', '')
    assum = '\n'.join(f'| {a[0]} | {a[1]} | {a[2]} |' for a in e['assumes'])
    src = e['source_md']
    couv = ('\n## Ce que la ligne GO COUVRE — dénominateur publié par Unity (à recopier dans « non vérifié » pour ce qui manque)\n\n' + e['couverture_go'] + '\n') if e.get('couverture_go') else ''
    return f"""# Dossier du juge visuel — {e['sym']} {e['nom']} — {e['tour']} — {DATE}

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : {e['nom']} ({e['sym']}, canon `{e['canon']}`) — contrôleur `{e['controleur']}`
- **Ce qu'on vient y faire** : {e['but']}
- **Chemin joueur emprunté par la capture** : {e['chemin']}
- **États capturés** : {e['etats']}

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
{refs}

{src}
{etats}
{POLICES_BLOC}

## Captures en jeu (Play Mode réel, compte réel, SOUS le chrome du shell)

| fichier (dans ce dossier) | résolution | état | prise le | test |
|---|---|---|---|---|
{caps}

{e.get('client_captures', '- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le MÊME bundle (674 clés) »)')} ; ce dossier est préparé sur `{SHA}`. Une capture est une mesure DATÉE.
- Compte photographié : {e.get('compte', "celui du shell par défaut, `operational_demo@example.test` (`AppShell.cs:104`), garni par le seeder — **pas un compte frais** ; son état au moment de la capture n'est pas re-mesurable ici")}.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
{e.get('captures_note', '')}
{couv}
# amendement 2026-09-06 (21:05) : la ligne GO publie son DÉNOMINATEUR de couverture ; le dossier le recopie tel quel
{e.get('echelle', ECHELLE_S6)}
{DOCTRINE}
{e.get('doctrine_extra', '')}
## Écarts ASSUMÉS — à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

⚠️ Un écart assumé a un PÉRIMÈTRE : la colonne de droite dit ce qui le ferait SORTIR de l'assumé (auquel cas
c'est un défaut à remonter). Sans elle, l'assumé absorbe en silence des défauts d'une autre classe.
{e.get('assumes_intro', '')}
| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
{assum}

{FORMAT_RAPPORT}
{non_fourni(e.get('non_fourni_extra', ''))}"""

# ─────────────────────────────────────────────────────────────────────────────────────────────
SCREENS = 'Assets/Screenshots'
S6 = 'ecrans-brennar-6.html'; S4 = 'ecrans-brennar-4.html'

def src_s6(idx_list, nominal, page=S6, autres=None):
    t = f"""- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `{ATELIER}/{page}` (atelier `{SHA_ATELIER}` ;
  références rendues au SHA `3c02f72`). Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet
  écran, avec la ligne où chacun commence :
{bloc_cadres(page, idx_list, nominal)}
  Le châssis commun (jetons de couleur, primitives) est `{ATELIER}/chassis6.py` — plusieurs classes ne sont
  DÉFINIES que là. La CSS sert à NOMMER les valeurs voulues (hex, px, états) ; si CSS et image divergent, l'image gagne.
- **Rendu** : `Tools/rendre-tel.py <page> <index> <sortie> 3.6` — Chrome sans tête, fenêtre généreuse puis recadrage
  à 300×584 CSS × 3,6 = 1080×2102, assertion de taille en sortie (anti-crop payé deux fois ici).
- ⚠️ **Témoin** : la référence rendue est le cadre NOMINAL. Si la capture montre un AUTRE état (liste vide, semaine
  en cours, rapport traité…), choisis le cadre d'état homologue dans `etats/` (quand ce répertoire existe dans le
  dossier — sinon il n'y a que la SOURCE, et c'est dit ici) — et dis lequel."""
    if autres: t += '\n' + autres
    return t

E = []

# ⑤ ─────────────────────────────────────────────────────────────────────────────────────────
E.append(dict(
    dossier='decision-du-jour', tour='r1', sym='⑤', nom='La décision du jour', canon='screen_1a',
    controleur='DecisionDetailScreenController',
    but="lire le détail de LA carte à fort levier du jour — ce qu'elle coûte, ce qu'elle change — et la trancher (Commit) ou la passer (Skip). Sur la maquette : une table de feutrine, la carte distribuée, le jeton de budget.",
    chemin="ouverture de session → Accueil → toucher la carte à fort levier (`hlCard.OnOuvrirDetail`, surimpression depuis `AppShell.cs:873`) — ici montée en surimpression par le test de planche, sur le compte de démo.",
    etats="un seul : celui du compte de démo au 2026-09-04 (une carte existe, ou non — c'est la première chose que ton inventaire dira).",
    references=[('reference-1080x2102.png', 'rendu du cadre nominal (série 4 #4, RATIFIÉ user « ok top on garde comme ça », 2026-08-26)', '1080×2102', '×3,6', '300 CSS = 1080 px'),
                ('etats/v4-4.png … v4-8.png', 'les 5 états de la série 4 (canon ratifié), ×3', '900×1752', '×3,0', '300 CSS = 900 px'),
                ('etats/ecran-canon.png · ecran-canon-vide.png · ecran-budget-pris.png · ecran-avec-lots-back.png', 'canons de la série 2 (grammaire antérieure — pour l\'intention, pas pour la mesure)', '900×1752', '×3,0', '300 CSS = 900 px')],
    source_md=src_s6([4, 5, 6, 7, 8], 4, page=S4, autres=f"- La série 6 reprend les mêmes cadres avec la matière « table » : `{ATELIER}/{S6}` #4-8 (l.740-758). La référence rendue vient de la **série 4**, la ratifiée."),
    captures=[('capture-1080x2400.png', '1080×2400 (20:9, cible téléphone)', 'compte de démo, monté en surimpression', '2026-09-04 11:22', 'PlancheEcransManquantsCapturePlayModeTests (`planche_la_decision_du_jour_1080x2400.png`)')],
    assumes=[
        ("les SIX écarts de COMPOSITION du r1 (décor de scène série 6 absent, carte inversée / table absente, l'écran comme autre objet…) — l'écran n'est pas recomposé", "ARBITRAGE user ouvert (f2 2026-09-06, atelier `4c89a16`) : à lister par leur id r1 dans la table ARBITRAGE, jamais recomptés comme régression", "un élément de composition qui aurait RÉGRESSÉ depuis le r1 (mesure, pas impression)"),
        ("F13 cachet de cire et F15 moletage du jeton : CSS pur (`border: 2px dashed #fff5` — l'alternance blanc α 0,333 / vide crante le bord)", "routés au correcteur (spec `decision-du-jour/spec-cachet-et-jeton.md`) — PAS assumés : à remesurer au r2 avec le MÊME oracle (σ de la couronne à 0,44×D : 71,31 en maquette, 1,25 sur un disque plat — il mesure l'alternance, pas la couleur ; un dégradé radial seul ne produit pas 71)", "σ de couronne toujours ≈ 1 ; 0 px de cire dans la zone de la carte"),
        ("les textes de la carte (titre de décision, libellés d'issue) ne sont pas ceux de la maquette", "les 24 chaînes françaises de la maquette n'ont AUCUNE source back (juge-données maquette, E8) ; le client les résout par ses propres clés i18n", "un enum brut, un repli anglais, ou une clé i18n visible (`hl.xxx`) — c'est alors un défaut de langue"),
        ("« elle reviendra demain, au même rang » / « sans retour » absents ou reformulés", "le back CONTREDIT ces deux libellés de la maquette (E2, E3 : la carte revient au même `opened_game_day`, un commit rend une carte NEUVE) — le client n'a pas à répéter un mensonge", "que la place du texte soit VIDE sans être fermée (trou de mise en page)"),
        ("2 options exactement, ou plus", "le contrat permet 2..4 options (E6) ; la maquette en fige 2", "au-delà de 2, un débordement ou un chevauchement — c'est un défaut de reflux"),
        ("état VIDE possible (aucune carte sur le compte)", "le canon dit que cet écran ne s'ouvre pas sans carte (E4) ; la maquette dessine pourtant un état vide (#5)", "un état vide qui ne ressemble pas au cadre #5, ou qui laisse un CTA actif"),
    ]))

# ⑯ ─────────────────────────────────────────────────────────────────────────────────────────
E.append(dict(
    dossier='revue-du-jour', tour='r1', sym='⑯', nom='La revue du jour', canon='screen_11',
    controleur='DailyReviewScreenController',
    but="le matin au Verge d'Or : chaque homme qui a dévié de sa routine a posé un jeton de confiance sur le zinc ; on le lui rend (valider) ou on le garde (passer outre, en appui long), et on tamponne le registre des routines.",
    chemin="Plus → LA REVUE DU JOUR (monté en surimpression par le test de planche, compte de démo).",
    etats="un seul : le compte de démo au 2026-09-04 (des signalements existent, ou « personne au comptoir »).",
    references=[('reference-1080x2102.png', 'rendu du cadre nominal (série 4 #0 « trois jetons sur le zinc », canon ratifié)', '1080×2102', '×3,6', '300 CSS = 1080 px'),
                ('etats/v4-0.png … v4-3.png', 'les 4 états de la série 4 (trois jetons · personne · après vos verdicts · avec lots back)', '900×1752', '×3,0', '300 CSS = 900 px'),
                ('etats/ecran-canon.png · ecran-canon-vide.png · ecran-avec-lots-back.png', 'canons de la série 2 (intention, pas mesure)', '900×1752', '×3,0', '300 CSS = 900 px')],
    source_md=src_s6([0, 1, 2, 3], 0, page=S4, autres=f"- Série 6, mêmes cadres en matière « registre » : `{ATELIER}/{S6}` #0-3 (l.697-727)."),
    captures=[('capture-1080x2400.png', '1080×2400', 'compte de démo, surimpression', '2026-09-04 11:22', 'PlancheEcransManquantsCapturePlayModeTests (`planche_la_revue_du_jour_1080x2400.png`)'),
              ('capture-seuil-force-1080x2400.png', '1080×2400', 'capture ANTÉRIEURE (2026-09-02) avec un seuil de flag forcé à 0,1 pour garnir la liste — autre monde, autre bundle', '2026-09-02 10:34', 'VuePrincipaleCapturePlayModeTests (`revue_du_jour_seuil-force-0.1_1080x2400.png`)')],
    captures_note="- ⚠️ La seconde capture n'est PAS comparable à la première (deux variables : le compte et le bundle i18n). Sers-t'en seulement pour voir la FORME d'une liste garnie si la première est vide — jamais pour un delta chiffré entre les deux.",
    assumes=[
        ("la ligne « motif » (« Le nouveau trajet passe à deux rues du commissariat ») absente ou générique", "`flag_reason` est une clé fixe par générateur (5 en tout) dont les params sont byte-identiques au descriptor — la charge ne porte PAS le motif (juge-données E1)", "une ligne de motif présente mais qui affiche un identifiant opaque ou une clé brute"),
        ("« Réacheminer la tournée 7 », « le coin du Lek », « le lavomatic » remplacés par des libellés génériques", "les params ne portent que des UUID et 2 énumérés (E2) — aucune étiquette humaine n'existe côté back", "un UUID visible à l'écran"),
        ("le compte de routines en ENTIER (« 17 routines », tampon « · 17 »)", "conflit de CANON (E3 : le canon interdit le scalaire, la maquette le dessine) — ARBITRAGE user, pas un défaut du client dans un sens ni dans l'autre", "—"),
        ("« Passer outre » sans feuille de confirmation", "divergence explicite d'un canon écrit (E5) — à ratifier, pas un défaut du client", "—"),
        ("bustes différents de la maquette (`#buste-fedora` ×3)", "identité visuelle sans source (E7) + ruling silhouettes contemporaines 2026-09-02", "un buste tronqué, ovale sans épaules, ou absent"),
        ("les noms des lieutenants sont ceux du compte de démo", "`lieutenant.name` est projeté depuis L0.4/C3 — les noms de la maquette (Salvatore, Vito, Rosa) sont de la fiction de dessin", "un nom vide, « Lieutenant » nu, ou un identifiant"),
    ]))

# ⑱ ─────────────────────────────────────────────────────────────────────────────────────────
E.append(dict(
    dossier='plus', tour='r1', sym='⑱', nom='Le menu Plus (« le Bureau du patron »)', canon='screen_12',
    controleur='AppShell.MonterMenuPlus (ce n\'est plus un locataire : c\'est le shell qui le dessine)',
    but="le seul menu du jeu : depuis le bureau cuir/acajou, choisir une destination parmi celles qui ne sont pas des onglets — chaque ligne portant, si elle en a, le nombre de choses ACTIONNABLES (jamais un « 0 »).",
    chemin="onglet PLUS (`shell.ActivateTab(Tab.More)`), capture prise juste avant que le test n'active la première entrée.",
    etats="un seul : le menu ouvert, compte de démo (semaine de compression annoncée ou non — c'est à lire sur l'image).",
    references=[('reference-1080x2102.png', 'rendu du cadre nominal (série 6 #20 « Le Bureau — tout le reste (semaine annoncée) »)', '1080×2102', '×3,6', '300 CSS = 1080 px'),
                ('etats/ecran-canon.png · ecran-compression-active.png', 'canons de la série 2 (les destinations · semaine en cours)', '900×1752', '×3,0', '300 CSS = 900 px')],
    source_md=src_s6([20, 21], 20),
    captures=[('capture-1080x2400.png', '1080×2400', 'menu ouvert, compte de démo', '2026-09-04 11:22', 'VuePrincipaleCapturePlayModeTests.Capture_EcranReputation_SousChrome (`menu_plus_1080x2400.png`)')],
    assumes=[
        ("**21 entrées** au lieu des ~8 destinations de la maquette", "les 9 écrans neufs du 2026-08-27 et les 9 sans porte du 2026-09-02 entrent tous par ce menu (`DestinationsPlus()`, 21 entrées / 21 contrôleurs / 21 libellés mesurés le 2026-09-04) ; la maquette est en retard sur le nombre", "une entrée COUPÉE par le dock, un débordement hors du panneau, deux entrées superposées, un défilement sans indice — le NOMBRE est assumé, sa MISE EN PAGE ne l'est pas"),
        ("aucun readout « 0 »", "canon `screen_12_more_menu.md:193` : badge zéro = badge absent ; la maquette de série 2 en dessinait trois (juge-données E3, défaut de MAQUETTE)", "un « 0 » visible"),
        ("pas de badge sur « Inspections »", "aucune route ne le sert (E5, lot back L1)", "—"),
        ("l'état `warning` de la semaine non dessiné", "la maquette ne dessine que `none` et `active` (E4) — si le compte est en `warning`, le rendu n'a pas de témoin", "—"),
    ]))

# ㉔ ─────────────────────────────────────────────────────────────────────────────────────────
E.append(dict(
    dossier='autonomie', tour='r1', sym='㉔', nom="L'autonomie (« le burner »)", canon='screen_c7',
    controleur='AutonomyInboxController',
    but="un téléphone à clapet : les messages de ceux qui ont refusé d'agir seuls — lire chaque rapport, taper 1 ou 2 pour trancher, voir ce qui traîne depuis plusieurs cycles.",
    chemin="Accueil → rapports d'autonomie (`DashboardController.cs:308`) — ici monté en surimpression par le test de planche, compte de démo.",
    etats="un seul : le compte de démo (des rapports, ou « aucun message »).",
    references=[('reference-1080x2102.png', 'rendu du cadre nominal (série 6 #25 « le burner : deux messages »)', '1080×2102', '×3,6', '300 CSS = 1080 px'),
                ('etats/ecran-canon.png · ecran-canon-vide.png · ecran-rapport-qui-traine.png', 'canons de la série 2 (deux rapports · rien · un rapport qui traîne)', '900×1752', '×3,0', '300 CSS = 900 px')],
    source_md=src_s6([25, 26, 27, 28, 29, 30], 25),
    captures=[('capture-1080x2400.png', '1080×2400', 'compte de démo, surimpression', '2026-09-04 11:22', 'PlancheEcransManquantsCapturePlayModeTests (`planche_l_autonomie_1080x2400.png`)')],
    assumes=[
        ("un rapport = UN point (jamais « point 2 sur 2 »)", "chaîne à 4 maillons comptée : le producteur déduplique par (cycle, catégorie) et la catégorie est une fonction pure de l'archétype ⇒ `issues.length == 1` toujours (juge-données E1)", "un rapport qui affiche plusieurs points MAL empilés (superposition) — la mise en page d'un seul point doit tenir"),
        ("catégorie et options suivent l'archétype du lieutenant", "E2/E3 : `category = projectCategory(archetype)`, `option_a/b = OPTION_PAIRS[archetype]` — la maquette en dessine d'incohérentes", "—"),
        ("pas de bandeau « 3 cycles » / couleur braise de l'âge", "`backlogCapCycles` n'a 0 site de projection (E6) — dessiné sans source", "une place réservée VIDE pour ce bandeau"),
        ("plusieurs rapports d'UN point pour le MÊME homme, d'âges 0, 1, 2…", "c'est l'état NATUREL du back quand ça traîne (E1, fin) — dessiné nulle part dans la maquette", "un empilement qui déborde ou coupe"),
        ("options illisibles (`label_key` brut) : NON assumé", "S7-b : `label_key` sans table de traduction — mais le bundle `fr` de 674 clés date de ce tour ; si une clé brute apparaît, c'est un DÉFAUT", "—"),
    ]))

# ㊲ ─────────────────────────────────────────────────────────────────────────────────────────
E.append(dict(
    dossier='reputation', tour='r9', sym='㊲', nom='La réputation (« le miroir »)', canon='screen_b3',
    controleur='ReputationScreenController',
    but="« le miroir » : on vient lire ce que son lieutenant a ABSORBÉ des règles qu'on lui a données — pas ce qu'on lui a dit, ce qu'il en a retenu. L'écran est UN portrait : le lieutenant, sa posture, ses quatre indices de tenue ; on se lit sur lui.",
    chemin="onglet PLUS → première entrée « LA RÉPUTATION » (chemin RÉEL du joueur, `Capture_EcranReputation_SousChrome`), compte de démo.",
    etats="un seul, celui du compte de démo — VIERGE (cadre #120) ou GARNI (cadre #119 : règles données, absorbées) : ton inventaire le dira, et c'est LE témoin à choisir.",
    references=[('reference-1080x2102.png', 'rendu du cadre nominal (série 6 #120 « Rien n\'a encore déteint » — l\'état VIERGE)', '1080×2102', '×3,6', '300 CSS = 1080 px'),
                ('etats/m-119.png … m-124.png', 'les 6 cadres du groupe rendus à ×3 (119 = canon garni, 121 dérive, 122 règles, 123 gages, 124 ce qui manque)', '900×1752', '×3,0', '300 CSS = 900 px')],
    source_md=src_s6([119, 120, 121, 122, 123, 124], 120, autres=f"- Générateur de cet écran : `{ATELIER}/generateur-reputation.py` (+ `chassis6.py` pour `.elast`, `.enseigne`, `.fen`, `.pann`, `.cta6`). Le cadre a une hauteur FIXE de **462 px CSS** (`reputation(cadre, H=462)`). ⚠️ Mesuré au r10 : **la maquette pose ce bloc EN BAS** du `.tel` (sous 434 px d'évocation de chrome, filet bas à y = 2078 sur 2102) ; **le client le pose EN HAUT** (sous le bandeau réel). L'ancrage est INVERSÉ — c'est un écart de mise en page à part entière (à classer), et il rend indécidable, sur une capture sans chrome, ce que le bandeau du shell recouvrirait. Un vide DANS le cadre se juge ; l'espace hors du cadre se lit à l'aune de cet ancrage."),
    captures=[('capture-1080x2400.png', '1080×2400', 'compte de démo, sous chrome, via Plus', '2026-09-04 11:22', 'VuePrincipaleCapturePlayModeTests.Capture_EcranReputation_SousChrome (`screen_b3_reputation_sous_chrome_1080x2400.png`)')],
    captures_note="- ⚠️ Il existe dans `Assets/Screenshots/` trois captures antérieures de cet écran SANS chrome (2026-09-02, compte frais, bundle anglais) : elles ne te sont pas fournies — autre monde.",
    non_fourni_extra="\n- **huit tours de juge (r1 → r8) existent dans `Tools/juge-visuel/reputation/`** — ils ne te sont pas fournis, ne les ouvre pas ;",
    assumes=[
        ("compteur ENFREINTES à « — » et non « 00 »", "aucune clé du corps ne porte ce compte (`boss_mirror_violation_ring` écrit, jamais projeté — juge-données É6) ; un « 00 » dirait « aucune » là où la vérité est « le serveur ne le dit pas »", "que le tiret n'ait ni la couleur ni la position des deux autres chiffres — un trou doit se lire comme un trou, pas comme une panne"),
        ("le col rendu par un TRIANGLE plein, sans le liseré du SVG", "pas de primitive de chemin dans le client ; le triangle porte le signal ouvert/fermé par sa largeur", "que ce ne soit pas un triangle (remplissage aire/boîte ~0,9 au lieu de ~0,43), qu'il ne soit pas centré sur l'axe du cou, qu'il recouvre le cou"),
        ("le reflet du miroir est FIXE", "la maquette l'anime (7,5 s) mais le rendu ratifié le fige à 34,7 % de course ; aucune animation sur cet écran (ruling)", "qu'il soit absent, ou ailleurs que dans le tiers haut du panneau"),
        ("4 couleurs hors `DesignTokens` (Encre, Panneau, Liseré, Vert)", "arbitrage DA escaladé, non tranché — dette de CODE, pas de rendu", "que la couleur RENDUE s'écarte de la maquette"),
        ("le nom du lieutenant est celui du compte, pas « Salvatore »", "`lieutenant.name` est projeté depuis C3 (L0.4) ; la mention « non projeté (L0.4) » d'un tour précédent est un DÉFAUT si elle subsiste (juge-données clôture D2)", "« SALVATORE » en dur, ou la mention « non projeté » encore visible"),
        ("pas de section « gages » (`restraint`)", "omise sans `counterparty_id` (É4) ; sur le compte de démo elle peut être absente", "une place réservée vide"),
    ]))

# ① ─────────────────────────────────────────────────────────────────────────────────────────
ECHELLE_HUD = """## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE `ecran-canon.png` (`.tel` de `hud-brennar.html`, 392 CSS) | 1176 | 392 | **×3,0** |
| CAPTURES (chrome ET intérieur de district dessinés à `LargeurHudBrennar = 392`) | 1080 | 392 | **×2,755** |
| | | **rapport capture ÷ référence** | **0,918** |

- ⇒ Ramène toute mesure en px CSS (÷3,0 sur la référence, ÷2,755 sur les captures) avant de conclure. Un rond de
  dock de 46 CSS fait 138 px sur la référence et **126,7 px** sur chaque capture — les deux sont justes.
- Géométrie du canon mesurée AU NAVIGATEUR (`Tools/mesurer-maquette.py`, `mesure-canon.txt` copié dans ce dossier) :
  `.tel` 392×696,88 · `.fiche` 366×169,19 à (13 ; 424,52) · `.dock` 390×90,17 · `.rond` 46 · `.medaillon` 64 ·
  `.aile.gauche` 96×33,55 · `.aile.droite` 97,95×26,31.
- Géométrie des captures, DÉRIVÉE du code (rect non imprimé, log non préservé) : canvas 1280 u de large,
  `scaleFactor` 0,84375 ⇒ 1280×2844,4 u à 1080×2400 et 1280×2275,6 u à 1080×1920.
- ⚠️ **Le fond de district n'est JAMAIS mis à l'échelle** : art natif 1080×1920 posé au pixel (propriété certifiée
  bit-exacte). À 1080×2400, ce que l'art ne couvre pas est un panneau de couleur DÉCLARÉE (`DistrictSceneBackdrop`),
  jamais nu. Des bandes unies ne sont pas un défaut de cadrage ; leur ÉTENDUE et leur lecture, si.
- ⚠️ Le canon montre un gros plan sur un bâtiment héros ; les captures sont au palier « district entier ». Ne
  compte pas la quantité d'art visible comme un écart : juge le CHROME, la FICHE, le DOCK, la palette, le rythme.
- Ce que la normalisation ne couvre pas : les rapports INTERNES (fiche/dock, médaillon/bandeau) restent réels.
"""
E.append(dict(
    dossier='ecran-principal', tour='r3', sym='①', nom="L'intérieur de district (« le HUD de Brennar »)", canon='hors canon',
    controleur='DistrictInteriorScreenController (+ le chrome du shell : bandeau, médaillon, dock)',
    but="l'écran que l'user désigne comme le plus important : voir son quartier vivant, repérer ses bâtiments, en toucher un pour lire ce qu'il vaut (la `.fiche`) et décider quoi en faire (COLLECTER · BLANCHIR · AMÉLIORER). Le bandeau porte l'argent, le manomètre de chaleur, le jour.",
    chemin="session réelle → carte de ville → ENTRER dans le district (16) → [pour les captures « fiche »] appui sur le premier bâtiment.",
    etats="trois captures : district SEUL sous chrome (1080×2400) ; fiche OUVERTE à 1080×1920 (résolution native de l'art) ET à 1080×2400. Le quart de jour (aube/nuit) est celui du compte de démo — la référence est de NUIT (« JOUR 12 · SOIRÉE »).",
    references=[('ecran-canon.png', 'rendu ratifié du `.tel` de `hud-brennar.html` (HUD v3.1 validé user, `5983267`), téléphone SEUL', '1176×2091', '×3,0', '392 CSS = 1176 px'),
                ('mesure-canon.txt', 'géométrie du canon mesurée au navigateur', '—', '—', '—'),
                ('maquette-hud-brennar.png', 'un AUTRE rendu de la même page (1680×3240) — non mesuré, ne pas s\'en servir comme référence principale', '1680×3240', '?', '—')],
    source_md=f"- **Source HTML/CSS** : `{ATELIER}/hud-brennar.html` (aide de lecture ; l'image gagne). Les jetons de couleur sont ceux de `DesignTokens.asset` (74) + le `:root` de l'atelier.\n- Rendu par `Tools/rendre-maquette.py` (2026-08-25) : `.tel` isolé, collé en 0,0, recadré à 392×697 CSS × 3, assertion de non-rognage passée.",
    captures=[('capture-district-1080x2400.png', '1080×2400', 'district seul, sous chrome, fiche fermée', '2026-09-04 11:22', 'VuePrincipaleCapturePlayModeTests (`screen_1_district_sous_chrome_1080x2400.png`)'),
              ('capture-fiche-1080x1920.png', '1080×1920 (native de l\'art)', 'fiche OUVERTE sur le premier bâtiment, 3 actions', '2026-09-04 11:22', 'idem (`vue_principale_fiche.png`)'),
              ('capture-fiche-1080x2400.png', '1080×2400', 'fiche OUVERTE, même bâtiment', '2026-09-04 11:22', 'idem (`vue_principale_fiche_1080x2400.png`)')],
    captures_note="- Gardes du test : bâtiments > 0, `TopBar` présent, district 16 actif, fiche portant le bâtiment cliqué et **exactement 3** boutons d'action. Les deux captures « fiche » sont hors écran (RenderTexture, layout refait à chaque résolution) — pas deux recadrages d'une même image.\n- ⚠️ **② la fiche bâtiment (`screen_2a`) n'a pas de dossier de juge à elle : elle se juge ICI**, contre `.fiche` du canon (366×169 CSS).",
    echelle=ECHELLE_HUD,
    non_fourni_extra="\n- **deux tours (r1, r2 du 2026-08-25) existent dans `Tools/juge-visuel/ecran-principal/`** — pas fournis, ne les ouvre pas ;",
    assumes_intro="\n⚠️ Cette table date du tour r2 (2026-08-25). Depuis : les 18 districts ont un nom de fiction, chaque bâtiment porte `name_i18n` (S2-a résolu), le bundle `fr` fait 674 clés, et l'écran a été repris. **Plusieurs de ces assumés sont peut-être PÉRIMÉS** — si la capture montre un nom là où la table dit « type », c'est la table qui a vieilli, pas un écart : note-le comme tel.\n",
    assumes=[
        ("les 3 chiffres de la fiche (`$ 2 400` · `$ 180/h` · `12%`) remplacés par des BANDES qualitatives", "le DTO ne porte que des bandes (R2.2 : jamais de scalaire en projection joueur) ; les trois cases gardent position et rôle", "une case vide, un scalaire inventé, ou trois cases qui ne s'alignent plus"),
        ("le nom du bâtiment remplacé par son TYPE — **peut-être périmé** (`name_i18n` par bâtiment depuis C3)", "au r2 : aucun nom en base ; depuis : `…/heat` porte `name_i18n`", "un nom vide, une clé brute"),
        ("le nom du district affiché là où le canon n'en met pas", "le back projette `name` (18 noms de fiction depuis le 2026-09-02) ; on met en forme", "un slug (`Verge-A`), un identifiant"),
        ("l'heure (« 21:40 ») remplacée par le quart du jour (« Aube »…)", "aucune minute de jeu côté client (forme F, `game_minute` non projeté — lot back)", "un libellé anglais ou vide"),
        ("libellés du dock : ACCUEIL · FAMILLE · FILIÈRE · PLUS (canon : EMPIRE · FAMILLE · MARCHÉ · PLUS)", "ce sont les destinations qui EXISTENT ; nommer un écran absent serait un mensonge d'interface", "un 5ᵉ onglet, un libellé coupé, une casse non uniforme"),
        ("les ronds du dock VIDES (canon : icône 20×20)", "l'user a dit « j'aime pas les icônes » — ARBITRAGE ouvert, à remonter tel quel", "—"),
        ("un bouton RETOUR (flèche) en haut à gauche, absent du canon (volute décorative)", "on est DANS un district : il faut pouvoir en sortir", "qu'il recouvre l'aile gauche du bandeau"),
        ("référence de NUIT, capture au quart de jour du compte", "état du monde, pas de l'écran — la palette globale et la luminance moyenne ne sont pas comparables ; restreins la palette au CHROME et à la FICHE", "—"),
    ]))

# ⑥ ─────────────────────────────────────────────────────────────────────────────────────────
ECHELLE_FAM = """## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE `family-organigramme-reference-1120.png` (`.sheet{width:560px}`) | 1120 | 560 | **×2,0** |
| CAPTURE — la FEUILLE (encre, bord à bord) | **à mesurer sur l'image** | 560 | = largeur mesurée ÷ 560 |

- ⚠️ Ici l'échelle de la capture N'EST PAS la largeur de l'écran : la feuille de l'organigramme est un panneau
  DANS l'écran (au dernier tour mesuré, 2026-08-25, elle faisait 1248 u sur un canvas de 1280, soit ~1053 px à
  1080 de large ⇒ ×1,88). **Mesure la largeur de la feuille (encre) sur la capture et dérive le facteur** ; cite-le
  dans ton annexe 3. Sans ça, tout paraîtra « 6 % trop petit ».
- Référence rendue par `Tools/family-organigramme-reference-render.sh` : Chrome sans tête, viewport 560 CSS,
  `--force-device-scale-factor=2`, fenêtre généreuse (1300) puis crop à l'encre (fond `--encre #0b1016`). Le client
  dessine à `FX()` = échelle du panneau : **1 unité de canvas = 1 px CSS de la référence** au facteur du panneau.
- Le chrome (bandeau, dock) est celui du shell (392 CSS ↔ 1280 u, ×2,755 px) — se juge contre le canon du HUD
  (`hud-canon-1176.png` dans ce dossier → `Tools/juge-visuel/ecran-principal/ecran-canon.png`), pas contre cette référence qui n'en a pas.
- Ce que la normalisation ne couvre pas : les rapports INTERNES (médaillon/rang, rang/rang, marges) restent réels.
"""
E.append(dict(
    dossier='famille', tour='r1', sym='⑥', nom="La Famille (l'organigramme)", canon='screen_3',
    controleur='LieutenantScreenController (vu du HAUT de la feuille — ⑧ l\'éditeur de règles est le même contrôleur, plus bas)',
    but="le mur de photos : le Don, ses lieutenants en rangs, chacun avec son archétype et son ancienneté, et sous chacun ses hommes — lire d'un coup d'œil qui tient quoi, et qui manque à la table.",
    chemin="onglet FAMILLE (`AppShell.cs:218`, `case Tab.Org`) — ici monté par le test de planche, sans défiler, compte de démo.",
    etats="un seul : le compte de démo (N lieutenants réels).",
    references=[('reference-1120.png', 'rendu ratifié de l\'organigramme (`ecrans-brennar.html` §1, ratifié user `0881e8a`, « DOCTRINE UI FINALE »), la feuille SEULE', '1120×1850', '×2,0', '560 CSS = 1120 px'),
                ('reference-source.html', 'extrait ISOLÉ et mis à l\'échelle du panneau (provenance CSS ligne par ligne)', '—', '—', '—'),
                ('etats/ecran-canon.png', 'canon de série 2 de l\'écran entier (900×1752, ×3, 300 CSS) — pour l\'intention et le chrome évoqué', '900×1752', '×3,0', '300 CSS = 900 px')],
    source_md="- **Source HTML/CSS** : `reference-source.html` dans ce dossier (l'extrait qui a rendu la référence) ; la page d'origine est `~/project/atelier3d-mafia/ecrans-brennar.html` §1 « Famille — l'organigramme ». L'image gagne sur la CSS.",
    captures=[('capture-1080x2400.png', '1080×2400', 'compte de démo, sous chrome, haut de la feuille', '2026-09-04 11:22', 'PlancheEcransManquantsCapturePlayModeTests (`planche_la_famille_1080x2400.png`, `nomFeuille: LieutenantSheet`)')],
    echelle=ECHELLE_FAM,
    assumes=[
        ("les noms sont ceux du compte de démo (pas « Salvatore « Sal » », « Vito Marchetti »…)", "`lieutenant.name` projeté depuis C3 ; les noms de la maquette sont de la fiction de dessin (juge-données E1)", "un nom vide, un identifiant, « Lieutenant » nu"),
        ("pas de « Loyauté 82 % »", "la seule grandeur est `loyalty_seed_bucket`, un enum à 4 valeurs (E2) — un pourcentage serait inventé", "une jauge ou un % affiché"),
        ("sous chaque lieutenant : « Aucune équipe rattachée » (ou rien) au lieu de « Nino · Coin de la 3ᵉ »", "aucune entité « homme » ne porte de `lieutenant_id` ni de nom (E3, E4, E5) — dessiné sans source", "un slot vide sans libellé, ou des noms inventés"),
        ("la puce montre l'ANCIENNETÉ, pas « Délégué / Direct »", "`mode` n'est projeté que sur le détail et est CONSTANT en production (E7)", "une puce vide"),
        ("pas de chip « Retiré », pas de rang grisé", "`extinction_state` : 0 écrivain de production (E6)", "—"),
        ("pas de « District du Don » sous le Don", "aucune route ne rend « mes districts » (E8)", "un district inventé"),
        ("pas de bandeau « Un siège libre à la table »", "le plafond (5) est un tunable jamais projeté (E10)", "—"),
        ("archétypes en français (Cuisinier, Comptable, Sécurité…)", "résolveur `FamilleLabels` (9 archétypes) ; la maquette en dessine 4 ratifiés", "un enum brut (`COOK`, `BOOKKEEPER`), un repli anglais"),
        ("bustes contemporains (Don nu, lieutenant à capuche, homme à casquette)", "ruling DA 2026-09-02 ; la référence porte encore des chapeaux", "un buste tronqué (épaules manquantes), ovale, ou absent"),
    ]))


# ㊵ ─────────────────────────────────────────────────────────────────────────────────────────
# Table d'écarts assumés = le rapport juge-données mode maquette du même jour
# (Tools/juge-donnees/screen_c2/maquette-2026-09-06/rapport.md, É1..É12) — transcrite, pas recopiée.
E.append(dict(
    dossier='screen_c2', tour='r1', sym='㊵', nom='Le blanchiment (« la filière »)', canon='écran neuf, sans id canon',
    controleur='FiliereScreenController',
    but="voir où en est chaque étape de la filière (le rang, la propreté de ce qui en sort, s'il y a de l'argent en attente), où la chaîne casse, ce qu'on ne peut pas commencer — et injecter du liquide sale au premier maillon.",
    chemin="onglet PLUS → « LA FILIÈRE » (chemin réel du joueur, `Capture_…FiliereSousChrome`), compte de démo.",
    etats="un seul : le compte de démo au 2026-09-04 (4 nœuds mesurés dans le corps réel, 1 seul `has_cash`).",
    references=[('reference-1080x2102.png', 'rendu du cadre nominal (série 6 #137 « où en est chaque étape ») — ratifié par délégation, ⚠️ porte un fait FAUX (voir assumés)', '1080×2102', '×3,6', '300 CSS = 1080 px')],
    source_md=src_s6([137, 138, 139, 140, 141, 142], 137, autres=f"- Générateur : `{ATELIER}/generateur-blanchiment.py` (+ `chassis6.py`)."),
    captures=[('capture-1080x2400.png', '1080×2400', 'compte de démo, sous chrome, via Plus', '2026-09-04 11:22', 'VuePrincipaleCapturePlayModeTests (`screen_c2_filiere_sous_chrome_1080x2400.png`)')],
    assumes_intro="\n⚠️ **La maquette elle-même est fausse sur un point, mesuré** (juge-données du jour, É1) : son CTA nominal est éteint (« INJECTER — IMPOSSIBLE », « il faut une planque, et rien n'en crée jamais ») alors que la planque a un écrivain de production depuis le 2026-08-31 et que le parcours joueur rend 200 sur `inject`. Si la capture montre un CTA ACTIF là où la référence le montre éteint, **c'est la référence qui a tort** : classe ARBITRAGE (maquette à corriger), pas défaut d'écran. Ne juge la FORME du CTA (géométrie, couleurs, typographie) que contre le cadre où il est actif, si tu en trouves un dans la source.\n",
    assumes=[
        ("les 4 étapes s'appellent « ÉTAPE 01 » … et non « Le comptoir · La blanchisserie · Le garage · Le notaire »", "aucune projection ne porte `building_id` (compté 0 dans les 3 projections, contrôles positifs 5/3/9) — dessiné sans source, forme F, déjà en dette TD-610", "un nom INVENTÉ (un des quatre noms de la maquette écrit en dur), ou une clé i18n brute"),
        ("pas de badge « écart » sur une étape, pas de compteur « écarts 00/01 »", "`deviation_active` n'existe que sur `GET /:nodeId` et le repository filtre `stage_index == 1` (404 ailleurs) ; aucun cardinal servi (É2, É3)", "un badge ou un compteur AFFICHÉ — il serait sans source"),
        ("les propretés des 4 étapes valent PARTIAL / MOSTLY_CLEAN / CLEAN / CLEAN, pas dirty→clean", "`base 0,40 + 0,25·(rang−1)` aux valeurs livrées (É4) ; DIRTY est inatteignable sans re-tuner", "une étape affichée DIRTY, ou un libellé hors des 4 membres de la bande"),
        ("la cuve remplie par paliers 25/50/75/100 %", "bande à 4 membres rendue en hauteur discrète — légitime (R2.2 interdit le scalaire, pas l'ordinal), à ASSUMER (É7)", "une hauteur qui ne soit pas l'un des 4 paliers"),
        ("« À demi propre » et non « à moitié »", "chaîne servie `blanchiment.purete.a_demi_propre` (`string_table.ts:1702`) — la maquette diverge (É9)", "—"),
        ("un libellé de propreté manquant sur PARTIAL", "`blanchiment.purete.partial` n'existe dans aucune locale (É8) — si le client tombe sur un repli, c'est un DÉFAUT à remonter tel quel, pas un assumé", "un repli anglais ou une clé brute visible ⇒ défaut"),
        ("le cadre 138 « la filière s'écarte de son profil » n'est pas capturable", "seuil de déviation 250 000 c, planque pleine = 40 000 c (É5, forme E)", "—"),
        ("les cadres 139/142 (« 04 maillons / 04 cassés ») sont périmés", "3 des 4 maillons sont refermés (É11) ; si le client affiche encore « 4 cassés », c'est une prose datée en production — DÉFAUT", "un compte de maillons cassés affiché ≥ 2"),
    ]))
LIENS_SUPPL = {
    'screen_c2': [('reference-1080x2102.png', JV / 'screen_c2/reference-1080x2102.png'),
                  ('capture-1080x2400.png', RACINE / SCREENS / 'screen_c2_filiere_sous_chrome_1080x2400.png')],
}


# ㊴ ─────────────────────────────────────────────────────────────────────────────────────────
# Table d'écarts assumés = le rapport juge-données mode maquette du même jour
# (Tools/juge-donnees/screen_b7/maquette-2026-09-06/rapport.md, E1..E13) — transcrite, pas recopiée.
E.append(dict(
    dossier='screen_b7', tour='r1', sym='㊴', nom='Le dossier (« ce qu\'ils ont sur vous »)', canon='écran neuf, sans id canon',
    controleur='ForensicScreenController',
    but="lire trois pistes qui ne se mélangent pas — l'audit des livres, l'effluent des blocs, le train de vie — chacune sur son échelle, le dernier palier étant un événement (ils sont venus) ; puis qui parle, qui a peur, qui ne reviendra pas, et ce qu'on peut acheter comme renseignement.",
    chemin="onglet PLUS → « LE DOSSIER » (chemin réel du joueur, `Capture_…DossierSousChrome`), compte de démo.",
    etats="un seul : le compte de démo au 2026-09-04 — corps réel mesuré : audit `watched`, effluent `glaring`, train de vie à lire sur l'image.",
    references=[('reference-1080x2102.png', 'rendu du cadre nominal (série 6 #131 « trois pistes qui ne se mélangent pas ») — ratifié par délégation', '1080×2102', '×3,6', '300 CSS = 1080 px')],
    source_md=src_s6([131, 132, 133, 134, 135, 136], 131, autres=f"- Générateur : `{ATELIER}/generateur-dossier.py` (+ `chassis6.py`)."),
    captures=[('capture-1080x2400.png', '1080×2400', 'compte de démo, sous chrome, via Plus', '2026-09-04 11:22', 'VuePrincipaleCapturePlayModeTests (`screen_b7_dossier_sous_chrome_1080x2400.png`)')],
    assumes_intro="\n⚠️ Le juge-données du jour a mesuré que **la maquette dessine 5 des 12 valeurs possibles des 3 bandes** — et que la valeur RÉELLE du compte de démo sur l'effluent (`glaring`) n'est dessinée dans AUCUN cadre. Si la capture montre un palier que la référence ne dessine pas, le client a inventé sa forme sans témoin : décris-la, classe-la ARBITRAGE (maquette incomplète), et juge tout le reste de la piste (échelle, position, typographie) contre le cadre le plus proche.\n",
    assumes=[
        ("le libellé de la 3ᵉ piste ne dit pas « votre » train de vie", "la donnée est PAR LIEUTENANT (PK `lieutenant_id`, jamais projetée) — la maquette attribue au joueur l'état d'un de ses hommes (E1, sens faux côté MAQUETTE)", "—"),
        ("pas de CTA « ACHETER DU RENSEIGNEMENT » sur la vue des pistes", "la route exige une cible (`:ref` + `actor_type`) ; la maquette l'offre sans cible et l'omet avec (E5, défaut de maquette)", "un CTA actif sans sélecteur d'acteur"),
        ("« cinq achetables » n'apparaît nulle part", "le back refuse 3 des 5 types inconditionnellement (E4) — la maquette asserte un fait faux", "—"),
        ("référence d'acteur = un identifiant opaque ou un libellé, pas « ia.actor.4f21 »", "B rend un UUID (E10) ; le nom du lawyer existe ailleurs (`me/legal`), le clerk n'a aucun nom en base", "un UUID complet visible à l'écran (défaut de langue)"),
        ("l'état vide « Rien à votre nom » est indiscernable de « tout au plus bas »", "même corps (E9) — si la capture montre l'un ou l'autre, la FORME se juge contre le cadre #135", "—"),
        ("pas de prix affiché avant l'achat", "aucune route joueur ne sert le tarif AVANT le débit (E6)", "un prix affiché — il serait inventé"),
        ("la 3ᵉ fenêtre de compteurs porte un seul sens", "la maquette en change d'un cadre à l'autre (E11) — le client en a choisi un ; ne pas le compter comme écart", "—"),
    ]))
LIENS_SUPPL['screen_b7'] = [('reference-1080x2102.png', JV / 'screen_b7/reference-1080x2102.png'),
                            ('capture-1080x2400.png', RACINE / SCREENS / 'screen_b7_dossier_sous_chrome_1080x2400.png')]


# ③ ─────────────────────────────────────────────────────────────────────────────────────────
# Table d'écarts assumés = le rapport juge-données mode maquette du même jour
# (Tools/juge-donnees/carte/maquette-2026-09-06/rapport.md, Ma..Mm + D1..D5) — transcrite, pas recopiée.
E.append(dict(
    dossier='carte', tour='r1', sym='③', nom='La Carte de Brennar (city map)', canon='screen_2',
    controleur='CityMapController',
    but="la ville de nuit, peinte : 18 quartiers nommés, le fleuve, le port ; lire d'un coup d'œil où ça chauffe (la bande de chaleur par quartier), qui est en chasse (les écussons de conviction), et approcher — entrer chez soi.",
    chemin="onglet EMPIRE (défaut) → la carte, sous chrome (`screen_2_carte_sous_chrome`), compte de démo.",
    etats="un seul : le compte de démo au 2026-09-04. La référence est de NUIT ; le jour, la semaine de compression et les pastilles par district sont des questions OUVERTES (ne pas les classer défaut).",
    references=[('reference-1080x2102.png', 'rendu du cadre nominal (série 6 #22 « Brennar la nuit ») — ratifié (ruling user 2026-08-26 : « c\'est le plus important, c\'est le premier écran »)', '1080×2102', '×3,6', '300 CSS = 1080 px'),
                ('capture-carte-seule-1080x2400.png', 'capture ANTÉRIEURE du 2026-09-03 13:45, ⚠️ PAS hors chrome (mesuré au r2 : même bandeau, même dock — 5 105 px de delta avec la planche principale, tous dans le chrome), prise pour livrer la ville peinte — autre run, à n\'utiliser que pour la lecture de la texture, jamais pour un delta', '1080×2400', '—', '—')],
    source_md=src_s6([22, 23, 24], 22, autres="- ⚠️ **La ville de la capture EST la peinture de la série 6** (texture 2100×3640 tirée du cadre, TD-494/560, 2026-09-03) : la géométrie, les rues, le fleuve doivent donc tomber JUSTE à un rééchantillonnage près — un écart de forme sur la ville elle-même désignerait la texture, pas le code. Ce qui se juge vraiment : le cadrage (quelle part de la peinture est visible, où), les 18 marqueurs de nom, la bande de chaleur, le chrome, la bande du bas."),
    captures=[('capture-1080x2400.png', '1080×2400', 'compte de démo, sous chrome', '2026-09-04 11:22', 'VuePrincipaleCapturePlayModeTests (`screen_2_carte_sous_chrome_1080x2400.png`)')],
    assumes_intro="\n⚠️ Le juge-données du jour a établi que **la géométrie de la ville est du DESIGN ratifié** (ruling user : « rien n\'a besoin d\'être vrai côté back — la géométrie est du design ») et que **8 libellés de la maquette n\'ont pas de clé i18n servie** (chaleur, conviction, profil, descente, aide, « Entrer »). Un libellé absent ou remplacé par le mot de la BANDE n\'est pas un défaut d\'écran.\n",
    assumes=[
        ("la ville (quartiers, rues, îlots, tours, parcs, fleuve, port, bateaux, lune, rose des vents) est la peinture, pas une donnée", "aucune colonne de géométrie en base (`world_geography.ts:30-45`) — design ratifié (Ma..Me)", "un quartier COUPÉ par le cadre, la texture étirée (rapport d'aspect ≠ 2100/3640), un marqueur hors de son quartier"),
        ("la COUCHE D'ÉTAT de la maquette — `ecusson · pin-esc · moi · nappe · lueur` (écussons de conviction, tracé de descente, « chez vous », lavis/halo de chaleur) — ABSENTE", "lot à part : `rendre-ville-peinte.py:82` retire exactement ces cinq groupes de la peinture (tranché f2 2026-09-06)", "un fragment cassé, une pastille, un aplat saturé posé à leur place"),
        ("18 noms de quartier en français", "`world/districts.name` (18/18 mesurés) ; substituteur de fiction dans la maquette", "un slug, un nom manquant, deux marqueurs qui se chevauchent"),
        ("le MOT de la chaleur (« tiède », « froid ») peut manquer ou différer", "la bande a sa source, le libellé n'a pas de clé i18n (Mf) — lot back i18n", "une clé brute ou un mot anglais (COLD, WARM…)"),
        ("les écussons de conviction peuvent manquer ou n'avoir pas de mot", "`belief` a 4 valeurs, 0 clé i18n (Mg) ; DORMANT (l'état de départ) n'a AUCUN dessin dans la maquette", "—"),
        ("« VOUS ÊTES ICI » / le quartier en or « chez vous » peut manquer", "aucune clé du back ne dit quel district est celui du joueur (Mj) ; dérivable de `me/buildings` seulement", "un « chez vous » posé sur le mauvais quartier (contrôle : les 4 bâtiments du kit sont au district 1, Les Bassins, mesuré §DA-4)"),
        ("« LE THRENNY », « LE PORT » peuvent manquer", "0 occurrence dans le bundle (Mc, Md)", "—"),
        ("« pincez pour approcher », « ENTRER dans le quartier » peuvent différer", "aide sans clé ; `carte.bloc.entrer` sert « Entrer » (Ml, Mm)", "un mot anglais"),
        ("le libellé de type de bâtiment de la bande du bas peut différer de « le labo, la planque… »", "deux familles i18n concurrentes (D3), aucune ne dit « la façade »", "une clé brute"),
        ("la bande de chaleur peut être JOUR/état différent de la référence", "ruling ouvert (jour / compression / pastilles) ; heat par district = 18 appels, l'écran peut n'en montrer qu'une partie", "—"),
    ]))
LIENS_SUPPL['carte'] = [('reference-1080x2102.png', JV / 'carte/reference-1080x2102.png'),
                        ('capture-1080x2400.png', RACINE / SCREENS / 'screen_2_carte_sous_chrome_1080x2400.png'),
                        ('capture-carte-seule-1080x2400.png', RACINE / SCREENS / 'carte_ville_1080x2400.png')]

# ─────────────────────────────────────────────────────────────────────────────────────────────
# LIENS : quelles images entrent dans chaque dossier
LIENS = {
    'decision-du-jour': [('reference-1080x2102.png', JV / 'decision-du-jour/reference-1080x2102.png')] +
        [(f'etats/{n}', JV / f'decision-du-jour/{n}') for n in ['v4-4.png', 'v4-5.png', 'v4-6.png', 'v4-7.png', 'v4-8.png', 'ecran-canon.png', 'ecran-canon-vide.png', 'ecran-budget-pris.png', 'ecran-avec-lots-back.png']] +
        [('capture-1080x2400.png', RACINE / SCREENS / 'planche_la_decision_du_jour_1080x2400.png')],
    'revue-du-jour': [('reference-1080x2102.png', JV / 'revue-du-jour/reference-1080x2102.png')] +
        [(f'etats/{n}', JV / f'revue-du-jour/{n}') for n in ['v4-0.png', 'v4-1.png', 'v4-2.png', 'v4-3.png', 'ecran-canon.png', 'ecran-canon-vide.png', 'ecran-avec-lots-back.png']] +
        [('capture-1080x2400.png', RACINE / SCREENS / 'planche_la_revue_du_jour_1080x2400.png'),
         ('capture-seuil-force-1080x2400.png', RACINE / SCREENS / 'revue_du_jour_seuil-force-0.1_1080x2400.png')],
    'plus': [('reference-1080x2102.png', JV / 'plus/reference-1080x2102.png')] +
        [(f'etats/{n}', JV / f'plus/{n}') for n in ['ecran-canon.png', 'ecran-compression-active.png']] +
        [('capture-1080x2400.png', RACINE / SCREENS / 'menu_plus_1080x2400.png')],
    'autonomie': [('reference-1080x2102.png', JV / 'autonomie/reference-1080x2102.png')] +
        [(f'etats/{n}', JV / f'autonomie/{n}') for n in ['ecran-canon.png', 'ecran-canon-vide.png', 'ecran-rapport-qui-traine.png']] +
        [('capture-1080x2400.png', RACINE / SCREENS / 'planche_l_autonomie_1080x2400.png')],
    'reputation': [('reference-1080x2102.png', JV / 'reputation/reference-1080x2102.png')] +
        [(f'etats/{n}', JV / f'reputation/r8-2026-08-31/reference/{n}') for n in ['m-119.png', 'm-120.png', 'm-121.png', 'm-122.png', 'm-123.png', 'm-124.png']] +
        [('capture-1080x2400.png', RACINE / SCREENS / 'screen_b3_reputation_sous_chrome_1080x2400.png')],
    'ecran-principal': [('ecran-canon.png', JV / 'ecran-principal/ecran-canon.png'),
        ('maquette-hud-brennar.png', JV / 'ecran-principal/maquette-hud-brennar.png'),
        ('mesure-canon.txt', JV / 'ecran-principal/mesure-canon.txt'),
        ('capture-district-1080x2400.png', RACINE / SCREENS / 'screen_1_district_sous_chrome_1080x2400.png'),
        ('capture-fiche-1080x1920.png', RACINE / SCREENS / 'vue_principale_fiche.png'),
        ('capture-fiche-1080x2400.png', RACINE / SCREENS / 'vue_principale_fiche_1080x2400.png')],
    'famille': [('reference-1120.png', RACINE / 'Tools/family-organigramme-reference-1120.png'),
        ('reference-source.html', RACINE / 'Tools/family-organigramme-reference-source.html'),
        ('etats/ecran-canon.png', JV / 'famille/ecran-canon.png'),
        ('capture-1080x2400.png', RACINE / SCREENS / 'planche_la_famille_1080x2400.png')],
}

LIENS.update(LIENS_SUPPL)

def preparer(e):
    d = JV / e['dossier'] / f"{e['tour']}-{DATE}"
    d.mkdir(parents=True, exist_ok=True)
    (d / 'mesures').mkdir(exist_ok=True)
    for nom, src in LIENS[e['dossier']]:
        assert src.exists(), f'source absente : {src}'
        lien(d / nom, src)
    # amendement 2026-09-07 (défaut de dossier ㊲ r16 : `hud-canon-1176.png` annoncé par dossier.md, jamais lié) : les liens COMMUNS
    # à tout écran sous chrome sont posés ici, pas à la main — sauf dans le dossier qui EST le canon du HUD.
    if e['dossier'] != 'ecran-principal':
        for nom, src in LIENS_COMMUNS:
            assert src.exists(), f'source absente : {src}'
            lien(d / nom, src)
    (d / 'dossier.md').write_text(ecran_md(e), encoding='utf-8')
    # contrôle : chaque image liée s'ouvre et a la taille annoncée dans la table
    from PIL import Image
    for nom, src in LIENS[e['dossier']]:
        if nom.endswith('.png'): Image.open(d / nom).size
    print(f"  {e['sym']} {e['dossier']}/{e['tour']}-{DATE} — {len(LIENS[e['dossier']])} liens, dossier.md {len(ecran_md(e))} o")
    return d

if __name__ == '__main__':
    print(f'client {SHA} · atelier {SHA_ATELIER} · polices : ' + ' · '.join(f'{k}→{v}' for k, v in POLICES.items()))
    for e in E: preparer(e)
