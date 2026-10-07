#!/usr/bin/env python3
"""Tableau écran × animation de maquette × cause × état Unity — COMPTÉ, pas déduit.

Entrée  : mesure-ecrans-brennar-6.json (mesurer-maquette.cjs, Chromium, document.getAnimations par cadre)
          + les 10 lignes du HUD (hud-brennar-canon.html : lues dans le CSS, voir HUD plus bas)
Sortie  : inventaire-animations.md (stdout si --stdout), avec SOMME DE CONTRÔLE.
"""
import json, collections, sys, os

ICI = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(ICI, "mesure-ecrans-brennar-6.json")))
rows = d["rows"]

# écran -> (libellé, cadres de ecrans-brennar-6.html)  — INDEX.md (Tools/juge-visuel) + front.md
GROUPES = [
    ("③ Carte",                      list(range(22, 25))),
    ("② Fiche — la serre",           list(range(36, 39))),
    ("② Fiche — le labo",            list(range(39, 45))),
    ("② Fiche — Ash (l'écrin)",      list(range(92, 95))),
    ("㉑ Marché",                     list(range(101, 107)) + [146]),
]
GEL = {"② Fiche — la serre", "② Fiche — le labo", "② Fiche — Ash (l'écrin)"}   # .serre6/.labo6/.ecrin6 : play-state paused !important

# (écran, keyframes) -> (cause dans la fiction, état Unity, preuve Unity)
ABS = "absente"
CAUSE = {
 "hl":  "le halo doré du pin « VOUS ÊTES ICI » respire (6 s) : le district du joueur veille",
 # serre
 "led": "les rampes de culture (LED) pulsent",
 "derive": "la brume de la serre dérive",
 "drip": "le goutte-à-goutte tombe",
 "spl": "la goutte éclabousse dans le godet",
 "respire": "le pot respire (balancement lent)",
 "tg": "la plante entière tangue",
 "sf": "chaque feuille pivote sur son pétiole (amplitude = santé : une plante qui souffre PEND)",
 "clign": "l'étiquette « à soigner » clignote (alerte)",
 # labo
 "rl": "la surface du ballon roule",
 "bl": "les bulles de l'ébullition (nucléation → éclatement)",
 "ec": "l'écume ondule en surface",
 "ch": "la résistance du chauffe-ballon / le témoin chauffe",
 "vp": "la vapeur monte dans la colonne",
 "fl": "l'eau du réfrigérant circule (stroke-dashoffset)",
 "cd": "le condensat glisse dans le réfrigérant",
 "rd": "la goutte ride le collecteur",
 "gt": "la goutte tombe du collecteur",
 # Ash
 "am": "l'ampoule d'établi vacille",
 "po": "la poussière flotte dans le faisceau",
 "sc": "les prismes d'Ash scintillent",
 "pe": "les pétales du lys de verre bougent",
 "cl": "le voyant clignote",
 "ci": "la cire (bougie) respire",
 # marché
 "mk-lampe": "la lampe du tableau du Verge d'Or",
 "mk-buee": "la buée du froid (marchandise réfrigérée)",
 "mk-eclat": "l'éclat des prismes",
 "mk-veille": "la veille des voyants allumés",
 "mk-scan": "le balayage du tablo (ligne cyan 2 px, 7,5 s)",
}

UNITY_SCENE_ABSENTE = {
 "② Fiche — la serre": "absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte)",
 "② Fiche — le labo": "absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur",
 "② Fiche — Ash (l'écrin)": "absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement",
 "③ Carte": "absente — l'hôte (le pin « VOUS ÊTES ICI ») n'existe pas côté client (DistrictCellView.cs:95)",
 "㉑ Marché": "absente — écran NON MONTÉ (aucun contrôleur `Market`)",
}
def etat_unity(g, name):
    if g in UNITY_SCENE_ABSENTE: return UNITY_SCENE_ABSENTE[g]
    return "absente"

out = []
P = out.append
total_pairs = total_inst = 0
tab = []
mapped = set()
for g, cad in GROUPES:
    sub = [r for r in rows if r["cadre"] in cad]
    for r in sub: mapped.add(id(r))
    inst = collections.Counter(r["name"] for r in sub)
    paused = collections.Counter(r["name"] for r in sub if r["state"] == "paused")
    percad = collections.defaultdict(set)
    for r in sub: percad[r["name"]].add(r["cadre"])
    for name in sorted(inst, key=lambda n: -inst[n]):
        tab.append((g, name, inst[name], len(percad[name]), len(cad), paused[name], CAUSE[name], etat_unity(g, name)))
        total_pairs += 1; total_inst += inst[name]
residu = [r for r in rows if id(r) not in mapped]

P("# Inventaire des animations — maquettes ↔ Unity (CLIENT-3, 07/10/2026)\n")
P("Méthode : chaque maquette est chargée dans Chromium (Playwright) ; `document.getAnimations()` énumère les animations RÉELLES, rattachées à leur cadre (`.cadre`). Rien n'est lu à l'œil. Unité = une paire (écran, `@keyframes`) appliquée à ≥ 1 élément ; « instances » = éléments animés, tous cadres de l'écran réunis.\n")
P("## A. ecrans-brennar-6.html (atelier, 147 cadres) — %d animations réelles mesurées\n" % len(rows))
P("| écran | @keyframes | instances | cadres animés / cadres de l'écran | gelées (paused) | cause dans la fiction | état Unity |")
P("|---|---|---:|---:|---:|---|---|")
for g, name, n, nc, ncad, np_, cause, un in tab:
    P("| %s | `%s` | %d | %d / %d | %d | %s | %s |" % (g, name, n, nc, ncad, np_, cause, un))
P("")
P("**Total A : %d paires (écran, @keyframes) · %d instances · %d animations mesurées dans le fichier · résidu non rattaché à un écran : %d.**" % (total_pairs, total_inst, len(rows), len(residu)))
par_ecran = collections.OrderedDict()
for g, name, n, *_ in tab:
    par_ecran.setdefault(g, [0, 0]); par_ecran[g][0] += 1; par_ecran[g][1] += n
P("Somme de contrôle A (paires, instances) par écran : " + " ; ".join("%s = %d, %d" % (g, a, b) for g, (a, b) in par_ecran.items()) + " ⇒ Σ paires = %d, Σ instances = %d." % (sum(a for a, b in par_ecran.values()), sum(b for a, b in par_ecran.values())))
anim_cad = sorted({r["cadre"] for r in rows})
P("Cadres portant ≥ 1 animation : %d sur %d. Les %d autres sont STATIQUES." % (len(anim_cad), d["ncadres"], d["ncadres"] - len(anim_cad)))
gel_inst = sum(1 for r in rows if r["state"] == "paused")
P("Animations en PAUSE dans ce fichier : %d (avant le dégel du 07/10, atelier b7d8c1a : 491 sur 554, bloc `.serre6/.ecrin6/.labo6{animation-play-state:paused !important}` du ruling 27/08 13h42 ; levé par d84c6eb, ruling du soir « animé le truc »)." % gel_inst)
P("")
P("## B. hud-brennar-canon.html (atelier `d84c6eb`) — ① Intérieur de district, lu dans le CSS (états `.tel.descente` / `.tel.jour` : le fichier ne les exerce qu'au clic)\n")
P("| # | écran | type | élément | cause dans la fiction | état Unity | preuve |")
P("|---:|---|---|---|---|---|---|")
HUD = [
 ("@keyframes `pouls` 1,1 s", "cerclage du médaillon + filet de la barre battent : la descente (la police est sur vous)", "présente", "TopBarController.Update:763 → Pouls() → AppliquerPouls (boitierRing, hairline)"),
 ("@keyframes `tremble` .14 s", "l'aiguille du manomètre tremble (+4° vers le chaud)", "présente", "TopBarController.Update:770 (Tremblement)"),
 ("@keyframes `gyroflip` .9 s", "le gyrophare de la voiture de police en planque (hue-rotate rouge↔bleu)", "partielle", "Gyrophare.cs : posé SEULEMENT sur le fond D (2 arts), la nuit, en descente (DoitSAllumer) ; 0 sur les autres fonds"),
 ("@keyframes `monte` 3,2 s", "le flotteur « + $320 » monte et s'efface (l'argent encaissé)", "absente", "grep floater/Monte : 0 dans Assets/Scripts"),
 ("transition `opacity .5s` (.fond)", "le fond passe du jour à la nuit en fondu", "absente", "aucun CrossFade ; le fond est choisi à la pose (DistrictInteriorScreenController)"),
 ("transition `background .6s` (.barre::after)", "le filet laiton vire à la braise quand la ville chauffe", "absente", "TopBarController : couleur posée d'un coup (UpdateAlarmState)"),
 ("transition `border-color .6s` (.medaillon .boitier)", "l'anneau du médaillon vire à la braise", "absente", "idem : aucune interpolation"),
 ("transition `box-shadow .6s` (.lunette)", "la lunette s'éclaire", "absente", "idem"),
 ("transition `opacity .5s` (.gyro)", "la lueur du gyrophare s'allume en fondu", "absente", "Gyrophare.Poser : posé plein d'un coup"),
 ("transition `transform .7s` (aiguille)", "l'aiguille du manomètre balaie jusqu'à sa nouvelle bande", "absente", "SetCitywideHeatBucket:703 : localEulerAngles posé d'un coup"),
]
nb = {"présente": 0, "partielle": 0, "absente": 0}
for i, (t, c, e, p) in enumerate(HUD, 1):
    P("| B%d | ① HUD | %s | | %s | **%s** | %s |" % (i, t, c, e, p)); nb[e] += 1
P("")
P("**Total B : %d lignes (4 @keyframes + 6 transitions) = %d présentes + %d partielles + %d absentes.**" % (len(HUD), nb["présente"], nb["partielle"], nb["absente"]))
P("")
P("## C. Maquettes à animation DÉFINIE mais NON APPLIQUÉE (0 instance mesurée)\n")
P("- ④ `ecrans-brennar-accueil.html` : 6 `@keyframes` définis (goutte, derive, respire, osc, pulseRose, clign), **0 animation en cours** sur les 5 cadres → ④ est statique en maquette.")
P("- `ecrans-brennar-6.html` : 13 `@keyframes` étaient morts avant d84c6eb ; 12 RETIRÉS (6 `*6-lampe`, 6 `*6-veille`) ; `mk-eclat` a maintenant son hôte : le cadre 146 (tuile Ash du marché, demande A1) porte 4 éclats — les 5 animations du marché tournent.")
P("- **Six `*6-scan` RETIRÉS le 07/10** (㉟ ㊱ ㊲ ㊳ ㊴ ㊵, 34 instances) : `.elast` est le panneau de TEXTE du châssis (liste, papier), pas un écran ni un terminal ; aucune cause dans la fiction (ruling f2 07/10 : ㊳ ㊴ sont des papiers, ㉟ ㊱ ㊲ ㊵ ne dessinent pas de terminal). Retirés des pages ET de `chassis6.py` ; les 6 générateurs déclarent `STATIQUE = True`. `mk-scan` du marché reste : son hôte est le `.tablo`, le tableau de voyants.")
P("- `ecrans-brennar-conflit-proposes-2026-09-24.html` : 33 noms définis, 0 animation en cours (㉙ statique).")
P("- Série 4 (`ecrans-brennar-4.html`), `-3`, `-5`, `-navigation`, `-7-lieutenant`, `-25-tutoriel`, `-34-composeur`, `-porte` : 0 animation en cours.")
P("")
P("## D. Animations Unity SANS maquette (le code les a inventées)\n")
P("| # | où | mécanisme | quoi |")
P("|---:|---|---|---|")
P("| D1 | ① DistrictInteriorScreenController | `AmbientPulseLoop.Update` (Mathf.Sin sur l'alpha, ≤ 4 simultanées, `MaxAmbientLoops`) | néon d'enseigne EARNING, fumée d'activité, scintillement de dette de maintenance (3 sources) — ajouté à des images posées pour une raison de DONNÉE |")
P("| D2 | Shell, BandeauEphemere | coroutine `Effacement` (fondu de sortie) | le bandeau éphémère (descente / ville chauffe / carte / rapport) se retire en fondu |")
P("")
P("## E. Totaux — Unity réellement animé, compté dans Assets/Scripts (182 .cs)\n")
P("Recherche exhaustive de `Animator|.anim|DOTween|LeanTween|ParticleSystem|AnimationCurve|IEnumerator qui écrit couleur/alpha/position|Update/LateUpdate qui écrit couleur, alpha, rotation, échelle, position`. 0 `.anim`, 0 `.controller`, 0 `Animator`, 0 `ParticleSystem`, 0 bibliothèque de tween dans le projet.")
P("Mécanismes visuels : **4** (3 méthodes `Update` + 1 coroutine) pour **5 effets** — (1) TopBarController.Update [pouls + tremble, 2 effets], (2) Gyrophare.Update, (3) AmbientPulseLoop.Update [3 sources, ≤ 4 instances], (4) BandeauEphemere.Effacement. Les autres `Update`/`LateUpdate`/coroutines (AppShell.Update = touche retour, LongPressButton/AppuiLong = minuterie d'appui long, DistrictMapNavigation = pan/zoom au doigt, ReputationScreenController/LaSuitePanelController/ExceptionQueueController.LateUpdate = mise en page, HorlogeLegere = scrutation) ne bougent rien à l'écran.")
P("Retour d'appui : 15 sites `Selectable.Transition.None` sur 67 créations de `Button` ; aucune animation d'appui écrite.")
P("")
P("## F. Bilan")
absent = sum(1 for t in tab if t[7].startswith("absente"))
P("- **Maquette → Unity, paires comptées (A + B) : %d.** Présentes %d · partielles %d · absentes %d." % (total_pairs + len(HUD), nb["présente"], nb["partielle"], absent + nb["absente"]))
P("- A : %d paires, toutes absentes. B : %d lignes, %d présentes, %d partielle, %d absentes. Contrôle : %d + %d = %d." % (total_pairs, len(HUD), nb["présente"], nb["partielle"], nb["absente"], total_pairs, len(HUD), total_pairs + len(HUD)))
print("\n".join(out))
if "--stdout" not in sys.argv:
    open(os.path.join(ICI, "inventaire-animations.md"), "w").write("\n".join(out) + "\n")
