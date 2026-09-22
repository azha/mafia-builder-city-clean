#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prépare les dossiers de juge du tour de RECAPTURE 2026-09-22 (les 55 constats suspendus du 07/09).

Un dossier `r<N>-2026-09-22/` par écran touché par `SUSPENSION-back-04-09-2026-09-07.md`, rempli d'après
`.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back), SANS capture : les captures se posent au
créneau (copies + sha256 + ligne d'identité), par l'orchestrateur ou le client. Ce que le script fige :
  - l'ÉCRAN (TABLE de `construire-dossiers.py` — la même source que l'INDEX, jamais une copie) ;
  - les RÉFÉRENCES : le nominal et les références NOMMÉES (`extras`), en LIENS vers les PNG commités ;
  - la CATÉGORIE MafiaCI qui produit la planche de l'écran et le NOM du fichier attendu (mesurés dans
    `Assets/Tests`, cf. `RECAPTURE-2026-09-22.md` §1) ;
  - les CONSTATS SUSPENDUS de cet écran (lus dans le document de suspension, jamais recopiés) ;
  - le renvoi vers `constats-a-rejuger*.md` quand il existe (⑮, ⑰, ㉟, ㊲) ;
  - l'échelle, les polices (`fc-match` EXÉCUTÉ maintenant), la doctrine, le format imposé.
⛔ Il ne prend aucune planche, ne rend aucune référence, ne touche pas Unity. Il n'écrase pas un
   dossier déjà présent (r2-⑮ a été écrit à la main le 2026-09-22 : il est la forme de référence).

Usage : python3 Tools/juge-visuel/preparer-r2-2026-09-22.py [--controle]
"""
import importlib.util, json, os, re, subprocess, sys, datetime

ICI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cd', os.path.join(ICI, 'construire-dossiers.py'))
cd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cd)
DATE = '2026-09-22'
SHA_CLIENT = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=cd.CLIENT, capture_output=True, text=True).stdout.strip()
SHA_ATELIER = cd.sha_atelier()

# dossier → (sym, nom du tour, [(catégorie, [planches attendues], note)])  — mesuré dans Assets/Tests (RECAPTURE §1)
PLAN = {
 'police':             ('⑰', 'r2-⑰',  [('PhotoPlanche', ['planche_le_commissariat_1080x2400.png'], 'sous chrome, surimpression (test de planche)')]),
 'vente':              ('㉟', 'r2',    [('PhotoPlanche', ['planche_la_vente_1080x2400.png'], 'sous chrome, surimpression'),
                                       ('PhotoVente', ['la_vente_1080x2400.png'], 'écran seul (LaVenteCapturePlayModeTests)')]),
 'compte':             ('㉓', 'r2-㉓',  [('PhotoPlanche', ['planche_la_vitrine_1080x2400.png'], 'sous chrome, surimpression'),
                                       ('PhotoVitrine', ['la_vitrine_1080x2400.png'], 'écran seul (LaVitrineCapturePlayModeTests)')]),
 'ecran_delegation':   ('㉜', 'r2',    [('PhotoPlanche', ['planche_ce_que_vous_avez_confie_1080x2400.png'], 'sous chrome, surimpression')]),
 'ecran_demolition':   ('㉝', 'r2',    [('PhotoPlanche', ['planche_raser_un_site_1080x2400.png'], 'sous chrome, surimpression')]),
 'compression':        ('⑭', 'r2',    [('PhotoPlanche', ['planche_la_semaine_1080x2400.png'], 'sous chrome, surimpression')]),
 'ecran_appro':        ('㉚', 'r2',    [('PhotoChantierC', ['planche_la_chaine_d_appro_1080x2400.png'], 'sous chrome, surimpression')]),
 'ecran_distribution': ('㉘', 'r2',    [('PhotoChantierC', ['planche_la_distribution_1080x2400.png'], 'sous chrome, surimpression')]),
 'ecran_loi':          ('㉛', 'r2',    [('PhotoChantierC', ['planche_la_loi_1080x2400.png'], 'sous chrome, surimpression')]),
 'ecran_conflit':      ('㉙', 'r2',    [('PhotoChantierC', ['planche_le_conflit_1080x2400.png'], 'sous chrome, surimpression')]),
 'carnet':             ('㉞', 'r2',    [('PhotoScreenC3SousChrome', ['screen_c3_sous_chrome_1080x2400.png'], 'sous le chrome RÉEL, par le chemin du joueur (Plus → LES ORDRES DU SOIR). ⛔ Le r1 a jugé `planche_signer_l_ordre_1080x2400.png`, qui photographie une fiche de LIEUTENANT, pas le carnet (TABLE, 2026-09-07)')]),
 'screen_c1':          ('㊳', 'r2',    [('CaptureJournal', ['screen_c1_journal_sous_chrome_1080x2400.png'], 'sous chrome'),
                                       ('PhotoScreenC1', ['screen_c1_1080x1920.png', 'screen_c1_1080x2400.png'], 'écran seul, deux résolutions')]),
 'screen_c6':          ('㊱', 'r2',    [('CaptureSousChrome', ['screen_c6_horizon_etat-vide_sous_chrome_1080x2400.png'], 'sous chrome (Capture_Horizon_SousChrome) — la catégorie produit AUSSI screen_2a_fiche_* et screen_5_* : surplus déclaré, non jugé ici'),
                                       ('CaptureHorizon', ['screen_c6_horizon_etat-vide_1080x2400.png'], "état vide, écran seul (ScreenC6C2) — signe avec la paire du RUN depuis 55e674db ; garde « 0 carte » = propriété du compte du run : rouge par construction s'il sert une carte, repli écrit (RECAPTURE §2.5)"),
                                       ('— (hors créneau)', ['screen_c6_1080x1920.png', 'screen_c6_1080x2400.png'], "ScreenC6C1 monte l'écran SANS jeton ni chargement : planche sans donnée servie, ne tranche aucun constat suspendu (RECAPTURE §5a) — NON FOURNI, et ce n'est pas un manque")]),
 'ecran-principal':    ('①', 'r10',   [('CaptureDistrict', ['screen_1_district_sous_chrome_1080x2400.png'], 'district sous chrome (planche photographiant operational_demo via le résolveur, cf. journal-recapture-district-2026-09-07.md)'),
                                       ('CaptureSousChrome', ['screen_2a_fiche_sous_chrome_1080x2400.png', 'screen_2a_fiche_sous_chrome_1080x1920.png'], 'la fiche sous chrome — surplus : screen_5_*, screen_c6_horizon_*')]),
}

def suspendus():
    """dossier → [(id, écart, section)] lus dans SUSPENSION-back-04-09-2026-09-07.md (A et B)."""
    out = {}
    section = None
    for l in open(os.path.join(ICI, 'SUSPENSION-back-04-09-2026-09-07.md'), encoding='utf-8'):
        if l.startswith('## A.'): section = 'A'
        elif l.startswith('## B.'): section = 'B'
        elif l.startswith('## C.'): section = None
        if section and l.startswith('| `'):
            c = [x.strip() for x in l.strip().strip('|').split('|')]
            chemin = c[0].strip('`'); d = chemin.split('/')[0]
            m = re.search(r'r\d+-([①-㊿])-', chemin)          # `police/r1-⑮-…` : le dossier porte deux écrans
            out.setdefault((d, m.group(1) if m else None), []).append((c[1], c[2], section))
    return out

def cadres_lignes(page):
    out = {}; idx = 0
    for n, l in enumerate(open(os.path.join(cd.ATELIER, page), encoding='utf-8').read().split('\n'), 1):
        for m in re.finditer(r'<div class="cadre">', l):
            et = re.search(r'class="etiquette">([^<]*)<', l[m.end():m.end() + 400]); out[idx] = (n, et.group(1) if et else '?'); idx += 1
    return out

def fc(fam):
    r = subprocess.run(['fc-match', fam], capture_output=True, text=True).stdout.strip()
    return r.split(':', 1)[1].strip() if ':' in r else r

POLICES = {f: fc(f) for f in ['Georgia', 'DejaVu Sans', 'Courier New', 'sans-serif', 'serif', 'Times New Roman', 'Segoe UI']}

def lien(src, dst):
    if os.path.lexists(dst): return
    os.makedirs(os.path.dirname(dst), exist_ok=True); os.symlink(src, dst)

def preparer(r, sym, tour, captures, susp, fm, controle):
    dossier = r['dossier']; R = os.path.join(cd.JV, dossier, f'{tour}-{DATE}')
    if os.path.exists(R):
        print(f'  {sym} {dossier}: {os.path.basename(R)} existe déjà — non touché'); return
    f = fm.get(sym, {})
    cadres = cadres_lignes(r['cadres'][0][0]) if r['cadres'] else {}
    idx_nominal = r['nominal'][1] if r['nominal'] else None
    nb = sum(1 for x in cd.TABLE + cd.HORS_APPSHELL if x['dossier'] == dossier)
    ref_nom = f"reference-{sym + '-' if nb > 1 else ''}1080x2102.png"
    refs = []
    if r['nominal'] and os.path.exists(os.path.join(cd.JV, dossier, ref_nom)):
        refs.append((ref_nom, f"rendu du cadre nominal (`{r['nominal'][0]}` #{idx_nominal} « {cadres.get(idx_nominal, ('?', '?'))[1]} »)" + (f" — {r['nominal_note']}" if r.get('nominal_note') else '')))
    manquantes = []
    for fichier, pourquoi in r.get('extras', []):
        # ⛔ jamais de lien vers un PNG qui n'existe pas encore : un lien mort se lit « fichier introuvable » chez le juge
        (refs if os.path.exists(os.path.join(cd.JV, fichier)) else manquantes).append((os.path.basename(fichier), pourquoi))
    if dossier == 'ecran-principal':
        refs.append(('hud-canon-1176.png', "le canon du HUD (`hud-brennar.html`, `.tel` de 392 CSS × 3 = 1176 px) — c'est LA référence de ① ; aucun cadre de série 4/6"))
    lignes_cadres = '\n'.join(f"  - #{i} (l.{cadres[i][0]}) — {cadres[i][1]}" + ('  ⇐ **cadre NOMINAL, rendu en référence**' if i == idx_nominal else '') for _, ixs in r['cadres'] for i in ixs if i in cadres)
    susp_rows = '\n'.join(f"| `{i}` | {e} | {s} |" for i, e, s in susp) or '| — | aucun constat suspendu lu pour ce dossier | — |'
    rejuger = [p for p in os.listdir(os.path.join(cd.JV, dossier)) if p.startswith('constats-a-rejuger') and (sym in p or '-' not in p.replace('constats-a-rejuger', '').replace('.md', ''))]
    rejuger_txt = ('\n'.join(f"- **`{dossier}/{p}`** — le périmètre exact du re-jugement de ce écran (tenu / à rejuger / caduc) : à lire AVANT de compter." for p in rejuger)) if rejuger else "- aucun `constats-a-rejuger` pour cet écran : la référence du tour précédent était la bonne ; seuls les constats SUSPENDUS ci-dessus sont à trancher, les autres tiennent."
    capt_rows = '\n'.join(f"| `{', '.join(pl)}` | `MAFIA_CI_CATEGORIES={cat}` | {note} | **NON FOURNI** — à poser au créneau |" for cat, pl, note in captures)
    if controle:
        print(f'  {sym} {dossier}: {os.path.basename(R)} — {len(refs)} référence(s), {len(susp)} suspendu(s), {len(captures)} capture(s) attendue(s)'); return
    os.makedirs(os.path.join(R, 'etats'), exist_ok=True)
    for nom, _ in refs: lien(f'../{nom}', os.path.join(R, nom))
    lien('../../ecran-principal/ecran-canon.png', os.path.join(R, 'hud-canon-1176.png'))
    for canon in sorted(os.listdir(os.path.join(cd.JV, dossier))):
        if canon.endswith('-canon.png') or canon.endswith('-vide.png'):
            lien(f'../../{canon}', os.path.join(R, 'etats', canon))
    ref_rows = '\n'.join([f"| `{n}` | {p} | 1080×2102 | ×3,6 | 300 CSS = 1080 px |" for n, p in refs]
                         + [f"| `{n}` | **NON RENDU au {DATE}** — {p} | — | — | — |" for n, p in manquantes]) or '| — | aucune référence rendue pour cet écran (aucune maquette de série 4/6) | — | — | — |'
    polices = '\n'.join(f"      {k:<18} →  {v}" for k, v in POLICES.items())
    dossier_md = f"""# Dossier du juge visuel — {sym} {f.get('nom', r['ctl'])} — {tour}-{sym if sym not in tour else ''} — {DATE}

> ⚠️ **Dossier PRÉPARÉ pour la RECAPTURE des constats suspendus du 07/09, pas encore instruisable : les captures manquent.**
> Généré par `Tools/juge-visuel/preparer-r2-2026-09-22.py` (atelier / DA) le {DATE}. Dès que le créneau de recapture a
> tourné (`RECAPTURE-2026-09-22.md`), l'orchestrateur pose ici les captures (COPIES + sha256 + ligne d'identité dans
> `captures-provenance.md`, journal joint) et ce dossier devient instruisable tel quel. S'il te manque autre chose, c'est un
> défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : {f.get('nom', '?')} ({sym}, canon `{f.get('id', '')}`) — contrôleur `{r['ctl']}`
- **Ce qu'on vient y faire** : {f.get('montre') or 'non pré-rempli (front.md sans « Montre »)'}
- **Chemin joueur emprunté par la capture** : {r['chemin']}
- **États capturés** : NON FOURNI — aucune capture encore. Attendues : voir la table des captures.
- **Pourquoi ce tour** : les planches jugées les 06–07/09 photographiaient un back du 04-09 (`SUSPENSION-back-04-09-2026-09-07.md`).
  Les constats ci-dessous ont été SUSPENDUS (pas rétractés) : ils attendent une planche prise sur le conteneur recréé. Les
  autres constats du tour précédent (forme, matière, géométrie) tiennent et ne sont pas à refaire.

## Ce qu'on te demande de trancher — les constats SUSPENDUS de cet écran (lus dans le document de suspension)

| id (tour précédent) | écart | section |
|---|---|---|
{susp_rows}

{rejuger_txt}

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
{ref_rows}
| `etats/*-canon.png`, `etats/*-vide.png` (s'ils existent) | canons antérieurs (série 2, ×3,0) — témoins d'ÉTAT, jamais la référence | 900×1752 | ×3,0 | 300 CSS = 900 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `{cd.ATELIER}/{r['cadres'][0][0] if r['cadres'] else '—'}` (atelier `{SHA_ATELIER}`).
  Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet écran :
{lignes_cadres or '  - aucune maquette de série 4/6'}
  {('⚠️ ' + r['note']) if r.get('note') else ''}
- **Rendu** : `Tools/rendre-tel.py <page> <index> <sortie> 3.6` — Chrome sans tête, recadrage à 300×584 CSS × 3,6 = 1080×2102,
  assertion de taille en sortie. Références nominales re-vérifiées le 2026-09-22 (⑮ ⑰ ㊲ re-rendues ; voir l'INDEX).
- **Polices — ce qui a RÉELLEMENT rendu la référence** (`fc-match` sur cette machine, exécuté à la génération de ce dossier le {DATE}) :

{polices}

  Le client embarque **DejaVu Sans** / **DejaVu Serif**. La série 6 demande `'DejaVu Sans'` (même police des deux côtés) et
  `Georgia,serif` (→ Noto Serif à la référence, DejaVu Serif au client) ⇒ un écart de FAMILLE ou de chasse sur le sérif est un
  **ARBITRAGE** ; la hauteur de capitale, elle, se compare.

## Captures en jeu (Play Mode réel, compte de capture, SOUS le chrome du shell) — À POSER AU CRÉNEAU

| fichier attendu (copie dans ce dossier) | commande qui le produit | rôle / angle mort | état |
|---|---|---|---|
{capt_rows}

- Protocole de planche : `RECAPTURE-2026-09-22.md` §2 (conteneur RECRÉÉ, horodatage de l'image lu PENDANT le run, empreinte à
  deux propriétés avant/après, un run = une paire, exportée sous `MAFIA_CAPTURE_*` SEULEMENT — `MAFIA_DEMO_*` posé = faute —,
  sha256 + preuve d'identité jointe : `[IDENTITE-CONNECTEE] … CONFORME` ou `[DemoIdentityResolver]` selon la catégorie,
  §2.4 ; `[IDENTITE-CAPTURE]` n'est PAS une preuve).
- **Corps réels comparables** : `{dossier}/corps-reels/` est sur `operational_demo` (22/09, pile `03cf564c`) ; il est REPRIS sur le
  compte du run, dans la fenêtre du créneau, par `passe-synchrone.py` (RECAPTURE §2.5). La provenance de chaque fichier dit le compte :
  si elle ne dit pas celui de la planche, les VALEURS vont en « non vérifié » — la forme se juge.

## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (cadre de série 6, `.tel` 300 CSS) | 1080 | 300 | **×3,6** |
| CAPTURE (contenu de l'écran, dessiné à `LargeurEcransBrennar6 = 300`) | 1080 | 300 | **×3,6** |
| | | **rapport capture ÷ référence** | **1,00** |

- Contenu : même échelle des deux côtés, un écart de taille est RÉEL. Le CHROME (bandeau, dock) n'est PAS à cette échelle :
  `AppShell.Px(css) = css × 1280/392` (×2,755) — il se juge contre `hud-canon-1176.png`, le contenu contre le cadre de série 6.
- Hauteurs : référence 584 CSS (2102 px) ; capture 666,7 CSS (2400 px) — aligner par PARTIES entre bandeau et dock.
- Les rapports INTERNES sont invariants d'échelle et restent des défauts réels.

## Règles de doctrine applicables

- Portrait ; gouttière (contenu entre bandeau et dock) ; contraste ≥ 3:1 / 4,5:1 sur l'art réel ; **langue affichée : français**
  via résolveurs nommés (un enum brut, une clé i18n ou un repli anglais à l'écran = écart de SENS) ; espace de mélange (sRGB
  maquette / linéaire client : un écart systématique = une erreur de modèle) ; animation : AUCUNE (paire T/T+1 s à fournir).
- Chrome non alimenté / phase « — » hors district = état VOULU ; ronds du dock vides = arbitrage user ; anglais dans la
  RÉFÉRENCE = maquette en retard ; cadre de style (sombre, napolitain, mafieux, fin 80s–début 90s) : direction = ARBITRAGE.
- **Une planche prise sur un back ANTÉRIEUR à la recréation n'est pas opposable** : le journal joint doit porter l'horodatage
  de l'image (`built_at`) et le `server_build_ref` ; sans eux, tout constat de VALEUR va en « non vérifié ».
- Une ligne de journal ne se cite que JOINTE.

## Écarts ASSUMÉS — à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| (à compléter par l'orchestrateur au top, depuis le `juge-donnees` mode maquette de l'écran s'il existe) | | |

## Format du RAPPORT — imposé

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \\| `MAJEUR` \\| `MINEUR` | `DÉJÀ APPLIQUÉ` \\| **`NOUVEAU`** | oui/non | <l'écart> | <les nombres> | <ou vide> |

- Pour chaque constat SUSPENDU listé plus haut : **tranché TENU / tranché CLOS**, avec la mesure sur la nouvelle planche — c'est
  le seul compte attendu de ce tour, en plus des `NOUVEAU`.
- gravité : liste fermée ; ASSUMÉ et ARBITRAGE à part ; le compte se prend dans la table.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client et ses tests ; les notes d'implémentation ;
- les rapports des juges précédents (`{dossier}/r<k>-…/`) — sauf la LISTE des constats suspendus recopiée ci-dessus, et le
  fichier `constats-a-rejuger` s'il existe (ce sont des périmètres, pas des jugements) ;
- pour l'instant : toute capture.

Préparé sur le client `{SHA_CLIENT}` (branche `da/2026-09-22`), atelier `{SHA_ATELIER}`.
"""
    open(os.path.join(R, 'dossier.md'), 'w', encoding='utf-8').write(dossier_md)
    open(os.path.join(R, 'captures-provenance.md'), 'w', encoding='utf-8').write("# Provenance des captures — COPIES avec empreinte (amendement 2026-09-06 : jamais de lien)\n\n> ⚠️ « dernier commit » = le commit du PNG, PAS le SHA de l'arbre qui l'a rendu. L'arbre de rendu n'est connu que si la suite l'imprime.\n\n| capture | source | dernier commit du PNG | sha256 | arbre de rendu | identité (ligne du journal) | note |\n|---|---|---|---|---|---|---|\n| — | — | — | — | — | — | AUCUNE CAPTURE ENCORE (" + DATE + ") : dossier préparé avant le créneau de recapture. |\n")
    open(os.path.join(R, 'journal-declare.txt'), 'w', encoding='utf-8').write("# NON FOURNI le " + DATE + " : aucune campagne encore. À joindre au créneau : la ligne d'identité du journal du run ([IDENTITE-CONNECTEE] … CONFORME pour PhotoPlanche, PhotoChantierC, CaptureHorizon ; [DemoIdentityResolver] régime=… identité=… pour les sept autres — RECAPTURE §2.4), le SHA de l'arbre du run (il DOIT contenir 55e674db — RECAPTURE §2.6), l'horodatage de l'image (built_at + server_build_ref) lu PENDANT le run, l'empreinte avant/après.\n")
    json.dump({'dossier': dossier, 'tour': f'{tour}', 'sym': sym, 'nom': f.get('nom'), 'canon': f.get('id'), 'controleur': r['ctl'], 'chemin': r['chemin'],
               'prepare_le': DATE, 'prepare_par': 'atelier / DA — preparer-r2-2026-09-22.py', 'client': SHA_CLIENT, 'atelier': SHA_ATELIER,
               'references': refs, 'cadres': {str(i): {'ligne': cadres[i][0], 'etiquette': cadres[i][1]} for _, ixs in r['cadres'] for i in ixs if i in cadres},
               'captures_attendues': [{'categorie': c, 'fichiers': pl, 'note': n} for c, pl, n in captures],
               'constats_suspendus': [{'id': i, 'ecart': e, 'section': s} for i, e, s in susp],
               'constats_a_rejuger': rejuger, 'polices_fc_match': POLICES, 'captures': []},
              open(os.path.join(R, 'entree-generateur.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  {sym} {dossier}: {os.path.basename(R)} écrit — {len(refs)} référence(s), {len(susp)} suspendu(s), {len(captures)} capture(s) attendue(s)')

def main():
    controle = '--controle' in sys.argv
    fm = cd.front_md(); susp = suspendus()
    table = {r['dossier']: r for r in cd.TABLE + cd.HORS_APPSHELL if r['dossier'] in PLAN}
    # police porte deux écrans : on cible celui du PLAN par son symbole
    for dossier, (sym, tour, captures) in PLAN.items():
        r = next((x for x in cd.TABLE + cd.HORS_APPSHELL if x['dossier'] == dossier and x['sym'] == sym), None)
        if r is None: print(f'⛔ {dossier} {sym} absent de la TABLE'); sys.exit(1)
        s = susp.get((dossier, sym), []) + susp.get((dossier, None), []) if dossier == 'police' else susp.get((dossier, None), []) + susp.get((dossier, sym), [])
        preparer(r, sym, tour, captures, s, fm, controle)
    manque = {d for d, _ in susp} - set(PLAN)
    if manque: print('⚠️ dossiers suspendus sans PLAN :', sorted(manque))

if __name__ == '__main__':
    main()
