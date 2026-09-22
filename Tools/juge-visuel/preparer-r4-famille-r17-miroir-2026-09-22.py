#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prépare les deux tours « jugés, puis réécrits » : ⑥ La Famille r4 et ㊲ Le miroir r17 (MANDAT §5-bis, RECAPTURE §3).

Même gabarit que les r2 du 2026-09-22 (`preparer-r2-2026-09-22.py`, dont il reprend les polices `fc-match` exécutées et la
forme des fichiers), SANS capture. Différence de fond : un r2 tranchait des constats SUSPENDUS ; ces tours-ci classent CHAQUE
constat du tour précédent en TENU / À REJUGER / CADUC, avec sa cause (texte réécrit, correctif client, référence re-rendue), et
nomment le texte réécrit à vérifier sur la capture fraîche. Le classement est écrit à la main dans les tables ci-dessous, avec
ses sources ; le script le recopie dans `constats-a-rejuger*.md` et dans chaque `dossier.md`, une seule vérité.

⛔ Ne prend aucune capture, ne rend aucune référence, ne touche pas Unity, n'écrase pas un dossier existant.
Usage : python3 Tools/juge-visuel/preparer-r4-famille-r17-miroir-2026-09-22.py [--controle]
"""
import importlib.util, json, os, subprocess, sys

ICI = os.path.dirname(os.path.abspath(__file__))
def charger(nom, fichier):
    spec = importlib.util.spec_from_file_location(nom, os.path.join(ICI, fichier)); m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m); return m
cd = charger('cd', 'construire-dossiers.py')
r2 = charger('r2', 'preparer-r2-2026-09-22.py')          # POLICES (fc-match exécuté), lien()
DATE = '2026-09-22'
CUMUL = 'gate/cumul-client-2026-09-22'
def sh(*a): return subprocess.run(list(a), cwd=cd.CLIENT, capture_output=True, text=True).stdout.strip()
SHA_CLIENT = sh('git', 'rev-parse', '--short', 'HEAD'); SHA_CUMUL = sh('git', 'rev-parse', '--short', CUMUL)
SHA_ATELIER = cd.sha_atelier()

# ─────────────────────────────── ⑥ La Famille : r3 (2026-09-06, APPROUVÉ, 0 B / 0 M / 14 m) → r4 ───────────────────────────────
FAMILLE = {
 'dossier': 'famille', 'sym': '⑥', 'tour': 'r4', 'precedent': 'r3-2026-09-06', 'verdict_precedent': 'APPROUVÉ (0 bloquant, 0 majeur, 14 mineurs)',
 'capture_precedente': 'client `77bd229` (planche `famille_1080x2400.png` du commit `4052923`, 06/09)',
 'changements': [
  ('`f1bcd5d3` (22/09)', "le dialogue de réaffectation en français (5 lignes) et le cycleur `AND_IF` sans condition dit « aucune »", "TEXTE RÉÉCRIT — sous-vues que le r3 n'a pas vues"),
  ('`a3404347` (22/09)', "le cadenas des primitives de l'éditeur de règles : « 🔒 palier {n} » / « 🔒 pas encore »", "TEXTE RÉÉCRIT — sous-vue que le r3 n'a pas vue"),
  ('`3b92b976` (07/09)', "un GLYPHE d'archétype (20 FX, teinte `hudCremeSecondary`) posé en tête de la ligne de pastille de chaque rang de lieutenant, quand le nom est servi (`LieutenantScreenController.cs` `PuceLigne`)", "ÉLÉMENT NEUF sur l'organigramme — absent de la référence (rendue le 02/09, 0 occurrence de glyphe dans sa source)"),
  ('`c4fd005e`, `06ef686b` (06/09)', "une garde de catalogue (les 5 paliers d'ancienneté demandés) et un commentaire", "aucun effet à l'écran"),
  ('`ProceduralUI.cs` (5 commits)', "fonctions AJOUTÉES (arc cuit, chemin, dégradés à palier, contraste) ; `Ring` : la rampe 1,5 devient la constante `RampeAntiCrenelagePx = 1.5f` (`5519acb3`), même valeur", "aucun effet sur les primitives de ⑥"),
  ('bundle servi, `famille.*`', "back `252a53ab` (06/09) → `4841d7ad` : 0 valeur changée ; 3 clés d'archétype ajoutées (MUSCLE, INTELLIGENCE, FACILITY_MANAGER), absentes de la capture r3", "aucun libellé de l'organigramme ne change"),
 ],
 'classement': [
  ('F1', 'MINEUR', "bord haut du rang du Don gris au lieu d'or", 'TENU', "rien n'a touché le rang du Don (pas d'archétype ⇒ pas de glyphe)"),
  ('F2', 'MINEUR', "bloc « qui » 19,7 % plus lâche (nom → pastille)", 'TENU', "la ligne de pastille garde sa hauteur mini (28 FX) ; le glyphe (20 FX) s'y loge à gauche — à re-constater, pas à re-dériver"),
  ('F3', 'MINEUR', "rang du Don : deux lignes 30 % plus serrées", 'TENU', "non touché"),
  ('F4', 'MINEUR', "halo du médaillon du Don à moins de la moitié", 'TENU', "non touché"),
  ('F5', 'MINEUR', "ombre portée des rangs à 48 %", 'TENU', "non touché"),
  ('F6', 'MINEUR', "anneau du bouton retour à −50 % d'énergie", 'TENU', "`Ring` : même rampe (1,5), seulement nommée"),
  ('F7', 'MINEUR', "disque intérieur des médaillons plus sombre, moins bleu", 'TENU', "non touché"),
  ('F8', 'MINEUR', "fond de tête en plaque pleine largeur", 'TENU', "non touché"),
  ('F9', 'MINEUR', "texte de pastille +11,4 % de capitale", 'TENU', "le texte de la pastille (`TenureBucketLabel`) n'a changé ni de valeur ni de corps"),
  ('F10', 'MINEUR', "rayon des coins des rangs −1,8 CSS", 'TENU', "non touché"),
  ('F11', 'MINEUR', "haut des cartes plus bleu, liseré plat", 'TENU', "non touché"),
  ('F12', 'MINEUR', "pointillé des emplacements vides plus clairsemé", 'TENU', "non touché"),
  ('F13', 'MINEUR', "anneaux de médaillon −11 % d'énergie", 'TENU', "`Ring` : même rampe"),
  ('F14', 'MINEUR', "rang du Don : « Vous » / « LE DON » au lieu de « Don V. » / « VOUS » (dépend des données)", 'TENU', "aucun commit n'a touché ces fentes"),
 ],
 'bilan': "**14 tenus · 0 à rejuger · 0 caduc.** Le texte réécrit ne touche AUCUN constat du r3 : le r3 n'a vu que l'organigramme, et les lots du 22/09 ont réécrit deux sous-vues (réaffectation, éditeur de règles) qu'aucune planche ne montre. Ce que le r4 doit trancher est donc NEUF : le texte des sous-vues (s'il est capturé) et le glyphe d'archétype sur l'organigramme.",
 'a_verifier': [
  ("dialogue de réaffectation, chargement", "Le lieutenant arrive… rouvrez « Réaffecter » quand sa fiche est là.", "④ annexe a, ⑥ `:2862`"),
  ("dialogue de réaffectation, question", "Confirmer la réaffectation ? Son ancienneté repart de zéro, et il lui faudra le temps de s'installer.", "④ annexe a, ⑥ `:2866`"),
  ("dialogue de réaffectation, ligne 1", "Installation prévue : {bande}", "④ annexe a, ⑥ `:2868`"),
  ("dialogue de réaffectation, ligne 2", "Ancienneté perdue : {bande}", "④ annexe a, ⑥ `:2870`"),
  ("dialogue de réaffectation, ligne 3", "Rendement perdu : {bande}", "④ annexe a, ⑥ `:2871`"),
  ("éditeur de règles, cycleur `AND_IF` vide", "aucune", "④ annexe a, ⑥ `:3405`"),
  ("éditeur de règles, primitive verrouillée par palier", "{JETON}  🔒 palier {n}", "④ annexe c3"),
  ("éditeur de règles, primitive pas dans ce build", "{JETON}  🔒 pas encore", "④ annexe c3"),
 ],
 'captures': [
  ('famille_1080x2400.png', '`MAFIA_CI_CATEGORIES=CaptureFamille` (`FamilleCapturePlayModeTests`, préfixe unique : 1 catégorie)', "l'organigramme, onglet FAMILLE — montre le glyphe d'archétype ; ne montre AUCUN des huit textes réécrits", "`[DemoIdentityResolver] régime=… identité=…` (le test passe par le shell de la scène de build ; pas de garde `[IDENTITE-CONNECTEE]`)"),
  ('— (aucune catégorie aujourd\'hui)', "**aucun test de capture n'ouvre la réaffectation ni l'éditeur de règles** (mesuré sur `" + CUMUL + "` : 4 fichiers de test touchent ces vues, 0 capture)", "les huit textes du tableau « à vérifier » — dette de CAPTURE, à écrire côté client ; tant qu'elle court, ces textes vont en « non vérifié »", '—'),
 ],
 'references': [('reference-1120.png', '../../../family-organigramme-reference-1120.png', "l'organigramme de référence (1120×1850), rendu le 02/09 (`7bfd1968`) — INCHANGÉ depuis le r3"),
                ('reference-source.html', '../../../family-organigramme-reference-source.html', "sa source (aide de lecture, ne prime jamais sur l'image)")],
 'etats': [('ecran-canon.png', '../../ecran-canon.png')],
}

# ─────────────────────────────── ㊲ Le miroir : r16 (2026-09-07, NON APPROUVÉ, 3 M / 8 m) → r17 ───────────────────────────────
MIROIR = {
 'dossier': 'reputation', 'sym': '㊲', 'tour': 'r17', 'precedent': 'r16-2026-09-07', 'verdict_precedent': 'NON APPROUVÉ (0 bloquant, 3 majeurs, 8 mineurs)',
 'capture_precedente': "client `3465929` (`correcteur/ecrans`, 07/09) ; référence reçue = `reference-1080x2102.png` au commit du rapport `5912525e`",
 'changements': [
  ('`240bbe34` (22/09)', "« Et personne ne jugera votre constance… » (#120) et « On vous dit que … ce n'est pas un choix, c'est ce qui manque encore » (#121) — `ReputationScreenController.cs`", "TEXTE RÉÉCRIT — le paragraphe du bloc bas"),
  ('`0d66e2e8` (07/09)', "l'ascenseur passe dans la gouttière libre (`CssAscenseurDepuisLeBord = 7`) — « 439 rangées sur l'encre → 0 »", "CORRECTIF CLIENT de `M1`"),
  ('`09acbe38` (07/09)', "l'état d'erreur : « LE MIROIR N'A PAS RÉPONDU »", "hors de l'état nominal capturé"),
  ('`be660caf` (09/09)', "chargement explicite (captures indépendantes de l'ordre)", "aucun effet à l'écran"),
  ('référence #120 re-rendue (atelier `20d006d`, 22/09)', "mesuré contre la référence que le r16 a reçue : chrome « $ 24 850 » → « 24 850,00 € », « tiède / HEAT » → « Tiède / CHALEUR » ; paragraphe bas réécrit et re-coupé ; **le reflet du miroir ne traverse plus la carte portrait** (médiane de la bande y 1000..1200, x 100..460 : 56,3 → 41,4) ; titre, compteurs, carte et tuiles : au pixel près (0,0 et 0,9/255, aucun décalage)", "RÉFÉRENCE CHANGÉE"),
 ],
 'classement': [
  ('M1', 'MAJEUR', "à 1920, l'ascenseur posé SUR le contenu", 'À REJUGER', "correctif client `0d66e2e8` (gouttière libre) — la planche 1920 le tranche"),
  ('M2', 'MAJEUR', "panneau élastique −11,6 %, la carte portrait en sort par le bas", 'À REJUGER', "le paragraphe du bloc bas est RÉÉCRIT (`240bbe34`) : son nombre de lignes fixe la hauteur laissée au panneau élastique ; la référence garde 3 lignes, le client peut en rendre un autre nombre"),
  ('M3', 'MAJEUR', "le visage déborde de la chevelure", 'TENU', "portrait inchangé des deux côtés (`ReputationPortrait.cs` non touché ; référence au pixel près sur la carte)"),
  ('m1', 'MINEUR', "col en V +54,4 % d'aire", 'TENU', "non touché"),
  ('m2', 'MINEUR', "reflet du miroir +68 % et bord à bord", 'À REJUGER', "la RÉFÉRENCE a changé : son reflet ne traverse plus la carte (56,3 → 41,4 sur la bande) — l'écart se re-mesure contre #120 re-rendu"),
  ('m3', 'MINEUR', "boîte de compteur sans dégradé intérieur", 'TENU', "compteurs au pixel près dans la référence ; client non touché"),
  ('m4', 'MINEUR', "lueur ambrée sous le rail haut", 'TENU', "non touché"),
  ('m5', 'MINEUR', "aparté « ce qu'il a absorbé » en 2 lignes au lieu de 3", 'TENU', "texte de l'aparté inchangé des deux côtés"),
  ('m6', 'MINEUR', "marges et hors-tout du cadre", 'TENU', "non touché"),
  ('m7', 'MINEUR', "boîte du CTA 6 px plus basse", 'TENU', "non touché"),
  ('m8', 'MINEUR', "filet or sous le sous-titre 6 px plus haut", 'TENU', "non touché"),
  ('A3', 'ASSUMÉ', "le reflet est FIXE, dans le tiers haut", 'À RE-VÉRIFIER', "même cause que `m2` : le reflet de la référence a changé"),
  ('R4', 'ARBITRAGE', "libellés de la maquette en retard (HEAT, tiède, $ 24 850, JOUR 12)", 'CADUC (3 sur 4)', "la référence re-rendue dit « CHALEUR », « Tiède », « 24 850,00 € » ; « JOUR 12 » reste une valeur de maquette"),
 ],
 'bilan': "**8 tenus · 3 à rejuger (M1, M2, m2) · 1 assumé à re-vérifier (A3) · 1 arbitrage caduc aux trois quarts (R4).** Les autres assumés (A1, A2, A4-A10) et arbitrages (R1-R3, R5, R6) tiennent. Le texte réécrit est le paragraphe du bloc bas.",
 'a_verifier': [
  ("bloc bas, état vierge (#120)", "… pas parce qu’il est médiocre. Et personne ne jugera votre constance tant qu’il n’a pas assez vu : indéterminé, jamais au milieu d’une jauge.", "① classe B ; client `240bbe34` ; référence `reference-1080x2102.png`"),
  ("bloc bas, état de dérive (#121) — si le compte du run le sert", "… On vous dit que vous dérivez, jamais sur quelle règle : ce n’est pas un choix, c’est ce qui manque encore.", "① classe B ; client `240bbe34` ; `reference-derive-1080x2102.png`"),
 ],
 'captures': [
  ('screen_b3_reputation_sous_chrome_1080x2400.png', '`MAFIA_CI_CATEGORIES=CaptureReputation` (`VuePrincipaleCapturePlayModeTests.Capture_EcranReputation_SousChrome`, préfixe unique : 1 catégorie)', "le miroir sous chrome, par le chemin joueur Plus → LA RÉPUTATION ; l'ÉTAT montré dépend du compte du run (vierge #120, dérive #121, indéterminé avec absorbé #144)", "`[DemoIdentityResolver] régime=… identité=…` (pas de garde `[IDENTITE-CONNECTEE]` dans cette méthode)"),
  ('screen_b3_reputation_sous_chrome_1080x1920.png', 'même méthode', "la 1920 — c'est elle qui tranche `M1`", 'idem'),
  ('temoin-menu-plus-1080x2400.png (← `menu_plus_1080x2400.png`)', 'même méthode', "témoin ⑱ : donne l'inset haut du contenu (méthode du r16, `R2`)", 'idem'),
 ],
 'references': [('reference-1080x2102.png', '../reference-1080x2102.png', "cadre NOMINAL #120 « Rien n'a encore déteint », RE-RENDU le 22/09 (atelier `20d006d`) — ⚠️ ce n'est PAS l'image que le r16 a reçue"),
                ('reference-derive-1080x2102.png', '../reference-derive-1080x2102.png', "cadre #121 (dérive), rendu le 22/09"),
                ('reference-indetermine-1080x2102.png', '../reference-indetermine-1080x2102.png', "cadre #144 (indéterminé AVEC de l'absorbé)"),
                ('hud-canon-1176.png', '../../ecran-principal/ecran-canon.png', "le canon du chrome (le chrome se juge contre lui, pas contre le cadre)")],
 'etats': [],
}

def table(rows, entetes):
    return '\n'.join(['| ' + ' | '.join(entetes) + ' |', '|' + '---|' * len(entetes)] + ['| ' + ' | '.join(r) + ' |' for r in rows])

def constats_md(d):
    return f"""# {d['sym']} — constats du {d['precedent']} classés pour le {d['tour']} : tenu / à rejuger / caduc

Atelier / DA, {DATE}. Généré par `Tools/juge-visuel/preparer-r4-famille-r17-miroir-2026-09-22.py` depuis sa table (la seule vérité).
Verdict du tour précédent : **{d['verdict_precedent']}** — capture : {d['capture_precedente']}.
Arbre de comparaison : `{CUMUL}` (`{SHA_CUMUL}`), l'arbre que la recapture doit utiliser (il contient `55e674db`, RECAPTURE §2.6).

## Ce qui a changé depuis la capture du tour précédent

{table([(a, b, c) for a, b, c in d['changements']], ['source', 'ce qui a changé', 'effet sur ce tour'])}

## Classement

{table([(f'`{i}`', g, e, f'**{c}**', w) for i, g, e, c, w in d['classement']], ['id', 'gravité', 'écart (résumé)', 'classement', 'pourquoi'])}

{d['bilan']}

## Le texte réécrit à vérifier sur la capture fraîche

{table([(o, f'« {t} »', s) for o, t, s in d['a_verifier']], ['où', 'texte attendu (fr)', 'source'])}
"""

def dossier_md(d, fm):
    f = fm.get(d['sym'], {}); r = next(x for x in cd.TABLE + cd.HORS_APPSHELL if x['dossier'] == d['dossier'])
    polices = '\n'.join(f"      {k:<18} →  {v}" for k, v in r2.POLICES.items())
    refs = table([(f'`{n}`', p) for n, _, p in d['references']], ['fichier (dans ce dossier)', 'rôle'])
    capt = table([(f'`{a}`', b, c, e, '**NON FOURNI** — à poser au créneau') for a, b, c, e in d['captures']], ['fichier attendu (copie dans ce dossier)', 'commande qui le produit', 'ce qu\'elle montre', 'preuve d\'identité exigée', 'état'])
    cl = table([(f'`{i}`', g, e, f'**{c}**') for i, g, e, c, _ in d['classement']], ['id (tour précédent)', 'gravité', 'écart', 'ce que tu en fais'])
    av = table([(o, f'« {t} »') for o, t, _ in d['a_verifier']], ['où', 'texte attendu (fr, ratifié)'])
    return f"""# Dossier du juge visuel — {d['sym']} {f.get('nom', r['ctl'])} — {d['tour']} — {DATE}

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent.** Généré par
> `Tools/juge-visuel/preparer-r4-famille-r17-miroir-2026-09-22.py` (atelier / DA) le {DATE}. Dès que le créneau a tourné, l'orchestrateur
> pose ici les captures (COPIES + sha256 + ligne d'identité dans `captures-provenance.md`, journal joint) et ce dossier devient
> instruisable tel quel. S'il te manque autre chose, c'est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ».

## L'écran

- **Nom** : {f.get('nom', '?')} ({d['sym']}, canon `{f.get('id', '')}`) — contrôleur `{r['ctl']}`
- **Ce qu'on vient y faire** : {f.get('montre') or 'non pré-rempli (front.md sans « Montre »)'}
- **Chemin joueur emprunté par la capture** : {r['chemin']}
- **Pourquoi ce tour** : le tour précédent ({d['precedent']}) a rendu **{d['verdict_precedent']}**. Depuis, du TEXTE de cet écran a été
  réécrit (lots du 2026-09-22) — un verdict rendu avant une réécriture ne couvre pas le texte réécrit (MANDAT §5-bis).

## Ce qu'on te demande de trancher

1. **Les constats du tour précédent**, un par un, selon ce classement (périmètre, pas jugement — `{d['dossier']}/{'constats-a-rejuger.md' if d['dossier'] == 'famille' else 'constats-a-rejuger-r17.md'}`) :

{cl}

   - **TENU** : constate-le sur la nouvelle capture (présent ou fermé), sans le re-dériver.
   - **À REJUGER** / **À RE-VÉRIFIER** : re-mesure-le contre la référence de CE dossier.
   - **CADUC** : ne le compte plus ; si l'écart réapparaît sous une autre forme, c'est un `NOUVEAU`.
2. **Le texte réécrit** — sur la capture, le texte affiché est-il exactement celui-ci ? Un texte ancien à l'écran = écart de SENS
   (le client n'a pas câblé), jamais l'inverse :

{av}

3. **Tout le reste** : `NOUVEAU`, au format imposé.

## Référence (fait autorité : l'IMAGE)

{refs}

- **Source HTML/CSS** : {', '.join(f'`{c[0]}`' for c in r['cadres'])} (atelier `{SHA_ATELIER}`) — aide de lecture, ne prime JAMAIS sur l'image.
  {('⚠️ ' + r['note']) if r.get('note') else ''}
- **Polices — ce qui a RÉELLEMENT rendu la référence** (`fc-match` exécuté à la génération de ce dossier) :

{polices}

  Le client embarque **DejaVu Sans** / **DejaVu Serif** ⇒ un écart de FAMILLE ou de chasse sur le sérif est un **ARBITRAGE** ;
  la hauteur de capitale, elle, se compare.

## Captures en jeu (Play Mode réel, compte de capture, SOUS le chrome du shell) — À POSER AU CRÉNEAU

{capt}

- Protocole : `RECAPTURE-2026-09-22.md` §2 — conteneur RECRÉÉ, horodatage de l'image lu PENDANT le run, empreinte à deux propriétés
  avant/après, **un run = une paire** exportée sous `MAFIA_CAPTURE_*` SEULEMENT (`MAFIA_DEMO_*` posé = faute), et ⛔ **l'arbre du run
  contient `55e674db`** (§2.6 — `main` au 22/09 ne le contient pas). La catégorie de cet écran n'est PAS dans la valeur unique du §1 :
  à ajouter au run, ou à lancer à part avec la même paire.
- **Corps réels comparables** : `{d['dossier']}/corps-reels/` ; s'ils ne sont pas du compte et de la fenêtre de la planche (`passe-synchrone.py`,
  RECAPTURE §2.5), les VALEURS vont en « non vérifié » — la forme se juge.

## Échelle — OBLIGATOIRE, jamais déduite par le juge

{'- Référence : `reference-1120.png` (1120×1850), rendue par `family-organigramme-reference-source.html` — même contrat que le r3 (voir son dossier pour les ancres) ; capture 1080×2400.' if d['dossier'] == 'famille' else '| | px | largeur CSS | facteur |' + chr(10) + '|---|---|---|---|' + chr(10) + '| RÉFÉRENCE (`.tel` 300 CSS) | 1080 | 300 | ×3,6 |' + chr(10) + '| CAPTURE (contenu à `LargeurEcransBrennar6 = 300`) | 1080 | 300 | ×3,6 |'}
- Le CHROME (bandeau, dock) n'est pas à l'échelle du contenu : `AppShell.Px(css) = css × 1280/392` ; il se juge contre le canon du HUD.
- Hauteurs : référence et capture n'ont pas la même hauteur — aligner par PARTIES entre bandeau et dock. Les rapports INTERNES
  sont invariants d'échelle et restent des défauts réels.

## Règles de doctrine applicables

- Portrait ; gouttière ; contraste ≥ 3:1 / 4,5:1 sur l'art réel ; **langue affichée : français** (un enum brut, une clé i18n ou un
  anglais à l'écran = écart de SENS) ; espace de mélange sRGB (maquette) / linéaire (client) ; animation : AUCUNE.
- Chrome non alimenté / phase « — » hors district = état VOULU ; ronds du dock vides = arbitrage user ; anglais dans la RÉFÉRENCE =
  maquette en retard.
- Une planche prise sur un back antérieur à la recréation n'est pas opposable ; une ligne de journal ne se cite que JOINTE.

## Format du RAPPORT — imposé

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \\| `MAJEUR` \\| `MINEUR` | `DÉJÀ APPLIQUÉ` \\| **`NOUVEAU`** | oui/non | <l'écart> | <les nombres> | <ou vide> |

- Chaque id du classement ci-dessus : **TENU / CLOS / NOUVEAU**, avec sa mesure. Chaque texte réécrit : **conforme / écart de sens /
  non capturé**. Le compte se prend dans la table ; ASSUMÉ et ARBITRAGE à part.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client et ses tests ; les rapports des juges précédents (seul le CLASSEMENT ci-dessus en est tiré — un périmètre) ;
- pour l'instant : toute capture.

Préparé sur le client `{SHA_CLIENT}` (branche `da/2026-09-22`), classement mesuré sur `{CUMUL}` (`{SHA_CUMUL}`), atelier `{SHA_ATELIER}`.
"""

def preparer(d, fm, controle):
    base = os.path.join(cd.JV, d['dossier']); R = os.path.join(base, f"{d['tour']}-{DATE}")
    nom_c = 'constats-a-rejuger.md' if d['dossier'] == 'famille' else 'constats-a-rejuger-r17.md'
    if controle:
        n = {c: sum(1 for x in d['classement'] if x[3].startswith(c)) for c in ('TENU', 'À REJUGER', 'À RE-VÉRIFIER', 'CADUC')}
        print(f"  {d['sym']} {d['dossier']}/{d['tour']}-{DATE} : {n} · {len(d['a_verifier'])} texte(s) · {len(d['captures'])} capture(s) attendue(s)"); return
    if os.path.exists(R):
        print(f"  {d['sym']} {os.path.basename(R)} existe déjà — non touché"); return
    open(os.path.join(base, nom_c), 'w', encoding='utf-8').write(constats_md(d))
    os.makedirs(os.path.join(R, 'etats'), exist_ok=True)
    for nom, cible, _ in d['references']: r2.lien(cible, os.path.join(R, nom))
    for nom, cible in d['etats']: r2.lien(cible, os.path.join(R, 'etats', nom))
    for nom, _, _ in d['references']:
        assert os.path.exists(os.path.join(R, nom)), f"lien mort : {nom}"          # jamais un lien vers rien
    open(os.path.join(R, 'dossier.md'), 'w', encoding='utf-8').write(dossier_md(d, fm))
    open(os.path.join(R, 'captures-provenance.md'), 'w', encoding='utf-8').write(
        "# Provenance des captures — COPIES avec empreinte (jamais de lien)\n\n| capture | source | dernier commit du PNG | sha256 | arbre de rendu | identité (ligne du journal) | note |\n|---|---|---|---|---|---|---|\n"
        f"| — | — | — | — | — | — | AUCUNE CAPTURE ENCORE ({DATE}) : dossier préparé avant le créneau. |\n")
    open(os.path.join(R, 'journal-declare.txt'), 'w', encoding='utf-8').write(
        f"# NON FOURNI le {DATE} : aucune campagne encore. À joindre : la ligne [DemoIdentityResolver] régime=… identité=… du journal du run (les catégories de cet écran n'appellent pas la garde [IDENTITE-CONNECTEE] — RECAPTURE §2.4), le SHA de l'arbre du run (il DOIT contenir 55e674db — RECAPTURE §2.6), l'horodatage de l'image (built_at + server_build_ref) lu PENDANT le run, l'empreinte avant/après.\n")
    json.dump({'dossier': d['dossier'], 'tour': d['tour'], 'sym': d['sym'], 'precedent': d['precedent'], 'prepare_le': DATE,
               'prepare_par': 'atelier / DA — preparer-r4-famille-r17-miroir-2026-09-22.py', 'client': SHA_CLIENT, 'cumul': SHA_CUMUL,
               'atelier': SHA_ATELIER, 'classement': [dict(zip(('id', 'gravite', 'ecart', 'classement', 'pourquoi'), x)) for x in d['classement']],
               'a_verifier': [dict(zip(('ou', 'texte', 'source'), x)) for x in d['a_verifier']],
               'captures_attendues': [dict(zip(('fichier', 'commande', 'montre', 'identite'), x)) for x in d['captures']],
               'polices_fc_match': r2.POLICES, 'captures': []},
              open(os.path.join(R, 'entree-generateur.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"  {d['sym']} {d['dossier']}/{os.path.basename(R)} écrit + {nom_c}")

def main():
    controle = '--controle' in sys.argv; fm = cd.front_md()
    for d in (FAMILLE, MIROIR): preparer(d, fm, controle)

if __name__ == '__main__':
    main()
