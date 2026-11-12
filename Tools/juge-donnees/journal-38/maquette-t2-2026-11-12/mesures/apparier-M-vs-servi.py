#!/usr/bin/env python3 -I
"""Apparie CHAQUE chaine dessinee des six cadres a la chaine FR SERVIE par le cumul 44a645a2.

`text-transform:uppercase` du CSS est applique a la chaine servie avant comparaison, quand la
regle CSS de l'element le porte (releve dans CSS_UPPER ci-dessous, chacun verifie a la source).
Rend : EGAL / EGAL-APRES-CSS-UPPER / DIFFERENT / CLE-ABSENTE.
"""
import json
import os
import re

OUT = os.path.dirname(os.path.abspath(__file__))
ST = json.load(open(os.path.join(OUT, "string-table-extrait.json"), encoding="utf-8"))
FR, EN = ST["FR"], ST["EN"]


def val(d, k):
    """La valeur litterale TS -> la chaine. Les valeurs sont stockees telles qu'ecrites ('...')."""
    if k not in d:
        return None
    v = d[k].strip()
    m = re.match(r"^'((?:[^'\\]|\\.)*)'$", v)
    if not m:
        return v
    s = m.group(1)
    return (s.replace("\\'", "'").replace("\\n", "\n").replace("\\u202f", " ")
             .replace("\\xa0", "\xa0").replace("\\\\", "\\"))


# element dessine -> (chaine dessinee, cle i18n candidate, CSS text-transform:uppercase ?, ancre CSS)
CAS = [
    ("M04 enseigne b",        "Le journal",                       "journal.bloc.le_journal",            False, ".jrn6 .enseigne b (pas de text-transform)"),
    ("M05 enseigne i",        "ce qui se dit ce matin",           "journal.bloc.ce_qui_se_dit_ce_matin", True,  ".jrn6 .enseigne i{...text-transform:uppercase}"),
    ("M05b enseigne i (alt)", "ce qui se dit ce matin",           "journal.moment.titre.dawn",          True,  "idem"),
    ("M07 libelle compteur",  "à la une",                         "journal.bloc.a_la_une",              True,  ".jrn6 .fen>span{...text-transform:uppercase}"),
    ("M09 libelle compteur",  "dans la rue",                      "journal.bloc.dans_la_rue",           True,  "idem"),
    ("M11 libelle compteur",  "en cours",                         "journal.bloc.en_cours",              True,  "idem"),
    ("M12 une: journal",      "LE CLAIRON DE BRENNAR",            "press.outlet.brennar_daily_star.name", True, ".jrn6 .une .jrn b{...text-transform:uppercase}"),
    ("M13 une: fraicheur",    "ce matin",                         "journal.fraicheur.fresh",            True,  ".jrn6 .une .jrn span{...text-transform:uppercase}"),
    ("M16 une: angle",        "angle accident",                   "news_beat.frame_tag.accident",       True,  ".jrn6 .une .angle{...text-transform:uppercase}"),
    ("M18 breve a",           "Un tramway en panne",              "ambient.micro_event.stalled_tram",   False, ".jrn6 .brv b (pas de text-transform)"),
    ("M18 breve b",           "Une livraison en retard",          "ambient.micro_event.delayed_shipment", False, "idem"),
    ("M18 breve c",           "Une rumeur de comptoir",           "ambient.micro_event.bar_rumor",      False, "idem"),
    ("M20 qd fresh",          "ce matin",                         "journal.fraicheur.fresh",            True,  ".jrn6 .brv .qd{...text-transform:uppercase}"),
    ("M20 qd settling",       "hier",                             "journal.fraicheur.settling",         True,  "idem"),
    ("M20 qd fading",         "la semaine passée",                "journal.fraicheur.fading",           True,  "idem"),
    ("M23 CTA",               "Y PRÊTER ATTENTION",               "journal.bloc.y_preter_attention",    True,  ".jrn6 .cta6{...text-transform:uppercase}"),
    ("M24 note avant geste",  "on peut assister à ce qui se passe — c’est le seul geste que la rue accepte",
     "journal.bloc.on_peut_assister_a_ce_qui_se_passe_c_est_le_seul_geste_que_la_rue_accepte", False, ".jrn6 .note6 (pas de text-transform)"),
    ("M24 note full",         "On vous a vu. La rue s’en souviendra.",                      "ambient.apres_assister.full",    False, "idem"),
    ("M24 note reduced",      "On vous a vu, mais vous étiez déjà passé aujourd’hui.",      "ambient.apres_assister.reduced", False, "idem"),
    ("M24 note minimal",      "Encore vous ? La rue n’y prête plus guère attention aujourd’hui.", "ambient.apres_assister.minimal", False, "idem"),
    ("M24 note none",         "Vous étiez là. Personne ici ne se connaît encore assez pour que ça compte.", "ambient.apres_assister.none", False, "idem"),
    ("M14 une: titre",        "Un enchaînement de circonstances à {district}, actuellement à l’étude",
     "news_beat.cooper_affair.accident.brennar_daily_star.headline", False, ".jrn6 .une h5 (pas de text-transform)"),
]

print("%-24s %-9s %-7s %s" % ("element", "verdict", "EN?", "cle / detail"))
print("-" * 118)
n_eg = n_css = n_diff = n_abs = 0
lignes = []
for lab, dessine, cle, upper, ancre in CAS:
    servi = val(FR, cle)
    if servi is None:
        v = "CLE-ABSENTE"; n_abs += 1
    elif servi == dessine:
        v = "EGAL"; n_eg += 1
    elif upper and servi.upper() == dessine.upper():
        v = "EGAL/CSS"; n_css += 1
    else:
        v = "DIFFERENT"; n_diff += 1
    lignes.append({"element": lab, "dessine": dessine, "cle": cle, "servi_FR": servi,
                   "css_uppercase": upper, "ancre_css": ancre, "verdict": v,
                   "servi_EN": val(EN, cle)})
    print("%-24s %-9s %-7s %s" % (lab, v, "oui" if val(EN, cle) is not None else "NON", cle))
    if v == "DIFFERENT":
        print("%26s dessine = %r" % ("", dessine))
        print("%26s servi   = %r" % ("", servi))

print("-" * 118)
print("EGAL=%d  EGAL-apres-CSS-uppercase=%d  DIFFERENT=%d  CLE-ABSENTE=%d  (total %d)"
      % (n_eg, n_css, n_diff, n_abs, len(CAS)))

# CONTROLE NEGATIF : une comparaison qui DOIT rougir
faux = val(FR, "journal.fraicheur.fresh")
assert faux != "demain", "controle negatif casse"
print("controle negatif : 'journal.fraicheur.fresh' != 'demain' -> %r  OK" % faux)
# CONTROLE POSITIF : la cle la plus citee doit etre servie dans LES DEUX bundles
for k in ("ambient.micro_event.stalled_tram", "journal.fraicheur.fading"):
    assert val(EN, k) and val(FR, k), k
print("controle positif : les 2 cles temoins sont servies EN et FR")

json.dump(lignes, open(os.path.join(OUT, "appariement-M-vs-servi.json"), "w", encoding="utf-8"),
          indent=1, ensure_ascii=False)
