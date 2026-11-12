# Portage FIDÈLE de ChaineDApproClient.{FinDeChaine, FinDeValeur, ChampsAuPremierNiveau, ObjetsDuTableau, LireCouts} et de
# ChaineDApproGestes.{CentimesLisibles, MotDeLaBande, SousTitreDuMode} (working tree, tour 2) — rejoue les vecteurs des gardes G-V1a/b/c, G-V2, G-V3, B1.
import re, sys
PAYLOAD_DATA = re.compile(r'"payload"\s*:\s*\{.*"data"\s*:\s*\{', re.S)
DEUX_POINTS = re.compile(r'\s*:\s*')
ENTIER = re.compile(r'(0|[1-9][0-9]*)\Z')
LITTERAL_NU = re.compile(r'(-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?|true|false|null)\Z')

def fin_de_chaine(s, debut):
    i = debut + 1
    while i < len(s):
        if s[i] == '\\': i += 2; continue
        if s[i] == '"': return i
        i += 1
    return -1

def fin_de_valeur(s, debut):
    if debut >= len(s): return -1
    c = s[debut]
    if c == '"':
        f = fin_de_chaine(s, debut); return -1 if f < 0 else f + 1
    if c in '{[':
        prof = 0; k = debut
        while k < len(s):
            d = s[k]
            if d == '"':
                k = fin_de_chaine(s, k)
                if k < 0: return -1
                k += 1; continue
            if d in '{[': prof += 1
            elif d in '}]':
                prof -= 1
                if prof == 0: return k + 1
            k += 1
        return -1
    j = debut
    while j < len(s) and s[j] not in ',}': j += 1
    return j

def champs_au_premier_niveau(objet, doubles):
    champs = {}
    i = objet.find('{')
    if i < 0: return None
    i += 1
    while i < len(objet) and objet[i].isspace(): i += 1
    if i < len(objet) and objet[i] == '}': return champs
    while True:
        if i >= len(objet) or objet[i] != '"': return None
        fin = fin_de_chaine(objet, i)
        if fin < 0: return None
        nom = objet[i+1:fin]
        m = DEUX_POINTS.match(objet, fin + 1)
        if not m: return None
        debut_valeur = fin + 1 + (m.end() - m.start())
        fv = fin_de_valeur(objet, debut_valeur)
        if fv < 0: return None
        brut = objet[debut_valeur:fv].strip()
        if len(brut) == 0: return None
        if brut[0] not in '"{[' and not LITTERAL_NU.match(brut): return None
        if nom in champs: doubles.add(nom)
        else: champs[nom] = brut
        i = fv
        while i < len(objet) and objet[i].isspace(): i += 1
        if i >= len(objet): return None
        if objet[i] == '}': return champs
        if objet[i] != ',': return None
        i += 1
        while i < len(objet) and objet[i].isspace(): i += 1

def objets_du_tableau(corps, nom):
    if not corps: return None
    m = re.search('"' + nom + r'"\s*:\s*\[', corps)
    if not m: return None
    objets = []; prof = 0; debut = -1; i = m.end()
    while i < len(corps):
        c = corps[i]
        if c == '"':
            i = fin_de_chaine(corps, i)
            if i < 0: return None
            i += 1; continue
        if c == '{':
            if prof == 0: debut = i
            prof += 1
        elif c == '}':
            prof -= 1
            if prof == 0 and debut >= 0: objets.append(corps[debut:i+1]); debut = -1
        elif c == ']' and prof == 0: return objets
        i += 1
    return None

def chaine_simple(brut):
    if brut is None or len(brut) < 2 or brut[0] != '"' or brut[-1] != '"': return None
    inter = brut[1:-1]
    return None if '\\' in inter else inter

class Couts:
    def __init__(s, c, b): s.c, s.b = c, b
    def centimes(s, m): return s.c.get(m) if m is not None else None
    def bande(s, m): return s.b.get(m) if m is not None else None

def lire_couts(corps):
    if not corps or not PAYLOAD_DATA.search(corps): return None
    lignes = []; par_mode = {}
    for tableau in ("maintenance", "rebuild"):
        objets = objets_du_tableau(corps, tableau)
        if objets is None: continue
        for objet in objets:
            doubles = set()
            champs = champs_au_premier_niveau(objet, doubles)
            if champs is None: continue
            mode = None if ('mode' in doubles or 'mode' not in champs) else chaine_simple(champs['mode'])
            if not mode: continue
            cents = champs['cost_cents'] if ('cost_cents' not in doubles and 'cost_cents' in champs and ENTIER.match(champs['cost_cents'])) else None
            bande = chaine_simple(champs['duration_band']) if ('duration_band' not in doubles and 'duration_band' in champs) else None
            if bande not in ('immediate', 'brief', 'extended'): bande = None
            lignes.append((mode, cents, bande)); par_mode[mode] = par_mode.get(mode, 0) + 1
    cp, bp = {}, {}
    for mode, cents, bande in lignes:
        if par_mode[mode] != 1: continue
        if cents is not None: cp[mode] = cents
        if bande is not None: bp[mode] = bande
    return Couts(cp, bp)

MOTS = {"immediate": "tout de suite", "brief": "quelques minutes", "extended": "plus longtemps"}
SEP = " · "
def sous_titre(dit_la_bande, mode, couts, consequence):
    mot = MOTS.get(couts.bande(mode)) if (dit_la_bande and couts is not None and couts.centimes(mode) is not None) else None
    return consequence if not mot else mot + SEP + consequence

# ── fabriques de corps, comme les helpers du test ──
def ligne(mode, cents, bande):
    return '{"mode":"' + mode + '"' + (',"cost_cents":' + cents if cents is not None else '') + (',"duration_band":"' + bande + '"' if bande is not None else '') + '}'
def corps(maint, rebuild): return '{"response_meta":{},"payload":{"data":{"maintenance":[' + ",".join(maint) + '],"rebuild":[' + ",".join(rebuild) + ']}}}'

CONTRAT = corps([ligne("quick_patch","5000","brief"), ligne("structural_reinforce","30000","extended"), ligne("reroute_bypass","5000","immediate")],
                [ligne("MINIMAL_REROUTE","10000","extended"), ligne("MODERATE_RESTRUCTURE","40000","extended"), ligne("FULL_GEOMETRIC_RESET","100000","extended")])
TEST7 = corps([ligne("quick_patch","35000","brief"), ligne("structural_reinforce","210000","extended"), ligne("reroute_bypass","35000","immediate")],
              [ligne("MINIMAL_REROUTE","70000","extended"), ligne("MODERATE_RESTRUCTURE","280000","extended"), ligne("FULL_GEOMETRIC_RESET","700000","extended")])

R = []
def ok(nom, cond, detail=''):
    R.append((nom, bool(cond))); print(("OK    " if cond else "ROUGE ") + nom + ("" if cond else "  " + str(detail)))

# V1a
c = lire_couts(CONTRAT)
att = [("quick_patch","5000","brief"),("structural_reinforce","30000","extended"),("reroute_bypass","5000","immediate"),("MINIMAL_REROUTE","10000","extended"),("MODERATE_RESTRUCTURE","40000","extended"),("FULL_GEOMETRIC_RESET","100000","extended")]
ok("V1a contrat lisible", c is not None)
for m, ce, b in att:
    ok(f"V1a {m} centimes={ce}", c.centimes(m) == ce, c.centimes(m)); ok(f"V1a {m} bande={b}", c.bande(m) == b, c.bande(m))
ok("V1a INCONNU/None nuls", c.centimes("INCONNU") is None and c.centimes(None) is None and c.bande("INCONNU") is None)
sans = lire_couts(corps([ligne("quick_patch","5000","brief"), ligne("structural_reinforce","30000","extended"), ligne("reroute_bypass",None,"immediate")],
                        [ligne("MINIMAL_REROUTE","10000","extended"), ligne("MODERATE_RESTRUCTURE","40000","extended"), ligne("FULL_GEOMETRIC_RESET","100000","extended")]))
ok("V1a CONTRÔLE cost_cents retiré => reroute_bypass non servi", sans.centimes("reroute_bypass") is None)
ok("V1a quick_patch reste servi", sans.centimes("quick_patch") == "5000")
ok("V1a bande de la ligne sans coût reste LUE", sans.bande("reroute_bypass") == "immediate")

# V1b
for faux in ["5000.5", '"5000"', "null", "1e3", "-5", "true", "[5000]", '{"v":5000}']:
    cc = lire_couts('{"payload":{"data":{"maintenance":[{"mode":"quick_patch","cost_cents":' + faux + ',"duration_band":"brief"}],"rebuild":[]}}}')
    ok(f"V1b cost_cents={faux} non servi", cc is not None and cc.centimes("quick_patch") is None, None if cc is None else cc.centimes("quick_patch"))
gros = lire_couts(corps([ligne("quick_patch","12345678901234567890","brief")], []))
ok("V1b montant > int64 intact", gros.centimes("quick_patch") == "12345678901234567890")
imb = lire_couts('{"payload":{"data":{"maintenance":[{"mode":"quick_patch","detail":{"cost_cents":5000},"note":"\\"cost_cents\\":5000"}],"rebuild":[]}}}')
ok("V1b cost_cents de sous-objet / dans une chaîne ignoré", imb.centimes("quick_patch") is None)
dbl = lire_couts(corps([ligne("quick_patch","5000","brief"), ligne("quick_patch","9000","extended"), ligne("reroute_bypass","5000","immediate")], [ligne("MINIMAL_REROUTE","10000","extended")]))
ok("V1b mode sur deux lignes => ni coût ni bande", dbl.centimes("quick_patch") is None and dbl.bande("quick_patch") is None)
ok("V1b voisins servis", dbl.centimes("reroute_bypass") == "5000" and dbl.centimes("MINIMAL_REROUTE") == "10000")
bd = lire_couts(corps([ligne("quick_patch","5000","weekly"), ligne("structural_reinforce","30000",None), ligne("reroute_bypass","5000","immediate")], ['{"mode":"MINIMAL_REROUTE","cost_cents":10000,"duration_band":3}']))
ok("V1b bandes hors union nulles", bd.bande("quick_patch") is None and bd.bande("structural_reinforce") is None and bd.bande("MINIMAL_REROUTE") is None)
ok("V1b coûts de ces lignes servis", bd.centimes("quick_patch") == "5000" and bd.centimes("structural_reinforce") == "30000")
ok("V1b CONTRÔLE bande immediate lue", bd.bande("reroute_bypass") == "immediate")
# lignes illisibles — vecteurs de la revue (B1) + virgules
voisine = ligne("reroute_bypass", "5000", "immediate")
for ab in ['{"mode":"quick_patch" "cost_cents":1}',
           '{"mode":"quick_patch","cost_cents":1 "duration_band":"brief"}',
           '{,"mode":"quick_patch","cost_cents":1}',
           '{"mode":"quick_patch","cost_cents":1,}',
           '{"mode":"quick_patch",,"cost_cents":1}',
           '{"mode":"quick_patch","cost_cents":1 2}']:
    cc = lire_couts(corps([ab, voisine], []))
    ok("V1b ligne illisible ignorée : " + ab, cc is not None and cc.centimes("quick_patch") is None and cc.centimes("reroute_bypass") == "5000",
       None if cc is None else (cc.c, cc.b))
tr = lire_couts('{"payload":{"data":{"maintenance":[{"mode":"quick_patch","cost_cents":1')
ok("V1b corps tronqué => rien de servi (non null)", tr is not None and tr.centimes("quick_patch") is None)
bl = lire_couts(corps(['{ "mode" : "quick_patch" ,\n "cost_cents" : 1 , "duration_band" : "brief" }', voisine], []))
ok("V1b CONTRÔLE POSITIF blancs permis => lue", bl.centimes("quick_patch") == "1" and bl.bande("quick_patch") == "brief", None if bl is None else (bl.c, bl.b))
# anciennes lignes mal formées de la revue (vecteur d'origine, avec `abime` dans la suite)
orig = lire_couts('{"payload":{"data":{"maintenance":[{"mode":"quick_patch" "cost_cents":1},{"mode":"reroute_bypass","cost_cents":5000,"duration_band":"immediate"}],"rebuild":[]}}}')
ok("V1b vecteur d'origine (revue B1) : quick_patch null, reroute_bypass 5000", orig.centimes("quick_patch") is None and orig.centimes("reroute_bypass") == "5000")
# champs répétés dans UNE ligne (m1)
cd = lire_couts(corps(['{"mode":"quick_patch","cost_cents":1,"cost_cents":2,"duration_band":"brief"}', voisine], []))
ok("m1 cost_cents répété => non servi, bande servie", cd.centimes("quick_patch") is None and cd.bande("quick_patch") == "brief")
bd2 = lire_couts(corps(['{"mode":"quick_patch","cost_cents":5000,"duration_band":"brief","duration_band":"extended"}', voisine], []))
ok("m1 duration_band répétée => coût servi, bande nulle", bd2.centimes("quick_patch") == "5000" and bd2.bande("quick_patch") is None)
md = lire_couts(corps(['{"mode":"quick_patch","mode":"reroute_bypass","cost_cents":7}', voisine], []))
ok("m1 mode répété => aucun mode servi par cette ligne ; voisin intact", md.centimes("quick_patch") is None and md.centimes("reroute_bypass") == "5000")
ok("V1b {\"payload\":{}} => null", lire_couts('{"payload":{}}') is None)
ok("V1b pas du json => null", lire_couts("pas du json") is None)
ok("V1b None => null", lire_couts(None) is None)
vide = lire_couts('{"payload":{"data":{}}}')
ok("V1b data vide => non null, rien de servi", vide is not None and vide.centimes("quick_patch") is None)

# V1c / M1 : sous-titre
CONS = {"quick_patch": "l’usure retombe, sans disparaître", "structural_reinforce": "l’usure est effacée", "reroute_bypass": "la liaison se repose : plus rien n’y passe tant qu’elle n’a pas récupéré"}
ok("M1 reroute_bypass sans coût MAIS bande immediate => conséquence seule", sous_titre(True, "reroute_bypass", sans, CONS["reroute_bypass"]) == CONS["reroute_bypass"], sous_titre(True, "reroute_bypass", sans, CONS["reroute_bypass"]))
ok("M1 quick_patch (coût+bande) => « quelques minutes · … »", sous_titre(True, "quick_patch", sans, CONS["quick_patch"]) == "quelques minutes" + SEP + CONS["quick_patch"])
full = lire_couts(CONTRAT)
ok("M1 CONTRÔLE POSITIF cost_cents servi => « tout de suite · … »", sous_titre(True, "reroute_bypass", full, CONS["reroute_bypass"]) == "tout de suite" + SEP + CONS["reroute_bypass"])
# V1c : un seul mode sans coût
ok("V1c un seul mode sans coût sur les 5", sum(1 for m in ["quick_patch","structural_reinforce","reroute_bypass","MINIMAL_REROUTE","FULL_GEOMETRIC_RESET"] if sans.centimes(m) is None) == 1)

# V2
t = lire_couts(TEST7)
for m, v in [("quick_patch","35000"),("structural_reinforce","210000"),("reroute_bypass","35000"),("MINIMAL_REROUTE","70000"),("FULL_GEOMETRIC_RESET","700000"),("MODERATE_RESTRUCTURE","280000")]:
    ok(f"V2 {m} = {v} (corps de test, aucun montant du contrat)", t.centimes(m) == v and t.centimes(m) not in ("5000","30000","10000","40000","100000"))

# V3
v3a = lire_couts(corps([ligne("quick_patch","5000","immediate"), ligne("structural_reinforce","30000","brief"), ligne("reroute_bypass","5000",None)], []))
ok("V3 brief/structural => quelques minutes · l’usure est effacée", sous_titre(True, "structural_reinforce", v3a, CONS["structural_reinforce"]) == "quelques minutes · l’usure est effacée")
ok("V3 immediate/quick_patch => tout de suite · …", sous_titre(True, "quick_patch", v3a, CONS["quick_patch"]) == "tout de suite · l’usure retombe, sans disparaître")
ok("V3 bande absente => conséquence seule", sous_titre(True, "reroute_bypass", v3a, CONS["reroute_bypass"]) == CONS["reroute_bypass"])
v3b = lire_couts(corps([ligne("quick_patch","5000","brief"), ligne("structural_reinforce","30000","extended"), ligne("reroute_bypass","5000","immediate")], []))
ok("V3 CONTRÔLE extended => plus longtemps · …", sous_titre(True, "structural_reinforce", v3b, CONS["structural_reinforce"]) == "plus longtemps · l’usure est effacée")
ok("V3 brief/quick_patch", sous_titre(True, "quick_patch", v3b, CONS["quick_patch"]) == "quelques minutes · l’usure retombe, sans disparaître")
ok("V3 reconstruction : conséquence seule malgré bandes lues", sous_titre(False, "MINIMAL_REROUTE", full, "on contourne ce qui gêne, au plus près") == "on contourne ce qui gêne, au plus près")

# B1 (feuille Reconstruire) : MODERATE lue
ok("B1 MODERATE_RESTRUCTURE lue = 280000", t.centimes("MODERATE_RESTRUCTURE") == "280000")

rouges = [n for n, v in R if not v]
print(f"\n{len(R)} vecteurs · {len(R) - len(rouges)} OK · {len(rouges)} ROUGE")
sys.exit(1 if rouges else 0)
