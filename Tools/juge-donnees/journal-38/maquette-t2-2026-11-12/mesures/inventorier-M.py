#!/usr/bin/env python3 -I
"""Inventaire M : chaque element porteur d'information des SIX cadres du journal.

Rend `inventaire-M.json` + un tableau lisible. Mesure en particulier :
 - l'appariement (couleur de pastille) x (mot de fraicheur) sur l'ENSEMBLE des six cadres ;
 - les compteurs vs le nombre d'elements RENDUS dans le meme cadre (controle E5) ;
 - la presence de la classe `visee` et de sa regle CSS.
"""
import html as H
import json
import os
import re

OUT = os.path.dirname(os.path.abspath(__file__))
PAGE = open(os.path.join(OUT, "maquette-a3e02c2a.html"), encoding="utf-8").read()
CADRES = [125, 155, 156, 157, 158, 170]


def txt(x):
    return H.unescape(re.sub(r"<[^>]+>", "", x)).strip()


res = {}
pastilles = []
for idx in CADRES:
    s = open(os.path.join(OUT, "cadre-%d.html" % idx), encoding="utf-8").read()
    pan = s[s.find('<div class="jrn6"'):]
    c = {}
    c["etiquette"] = txt(re.search(r'<div class="etiquette"[^>]*>(.*?)</div>', s, re.S).group(1))
    c["enseigne_b"] = txt(re.search(r'<div class="enseigne"><b>(.*?)</b>', pan).group(1))
    c["enseigne_i"] = txt(re.search(r"<i>(.*?)</i>", pan).group(1))
    c["compteurs"] = [(txt(a), txt(b)) for a, b in
                      re.findall(r'<div class="fen"><b>(.*?)</b><span>(.*?)</span></div>', pan)]
    une = re.search(r'<div class="une">(.*?)</div>\s*(?=<div class="brv)', pan, re.S)
    u = une.group(1) if une else ""
    c["une_outlet"] = txt(re.search(r'<div class="jrn"><b>(.*?)</b>', u).group(1))
    m = re.search(r'<span style="color:(#[0-9a-f]{6})">(.*?)</span>', u)
    c["une_fraicheur"] = (m.group(1), txt(m.group(2)))
    c["une_titre"] = txt(re.search(r"<h5>(.*?)</h5>", u, re.S).group(1))
    c["une_cle"] = txt(re.search(r'<span class="cle">(.*?)</span>', u).group(1))
    c["une_angle"] = txt(re.search(r'<span class="angle">(.*?)</span>', u).group(1))
    brv = []
    for m in re.finditer(
        r'<div class="brv( visee)?"><span class="pt" style="background:(#[0-9a-f]{6})"></span>'
        r"<div><b>(.*?)</b><span>(.*?)</span></div>"
        r'<span class="qd" style="color:(#[0-9a-f]{6})">(.*?)</span></div>', pan):
        e = {"visee": bool(m.group(1)), "pastille": m.group(2), "descripteur": txt(m.group(3)),
             "quartier": txt(m.group(4)), "qd_couleur": m.group(5), "qd_mot": txt(m.group(6))}
        brv.append(e)
        pastilles.append((e["pastille"], e["qd_mot"], e["qd_couleur"], idx))
    c["breves"] = brv
    c["cta"] = txt(re.search(r'<span class="cta6([^"]*)">(.*?)</span>', pan).group(2))
    c["cta_classes"] = re.search(r'<span class="cta6([^"]*)">', pan).group(1).strip()
    c["note"] = txt(re.search(r'<div class="note6">(.*?)</div>', pan, re.S).group(1))
    c["nb_une_rendues"] = pan.count('<div class="une">')
    c["nb_breves_rendues"] = len(brv)
    c["nb_evt_rendus"] = len(re.findall(r'<div class="evt[" ]', pan))
    res[idx] = c

print("=" * 100)
for idx in CADRES:
    c = res[idx]
    print("\n--- CADRE %d : %s" % (idx, c["etiquette"]))
    print("  enseigne        : %r / %r" % (c["enseigne_b"], c["enseigne_i"]))
    print("  compteurs       : %s" % c["compteurs"])
    print("  rendus          : une=%d  breves=%d  evt=%d" % (c["nb_une_rendues"], c["nb_breves_rendues"], c["nb_evt_rendus"]))
    print("  une             : outlet=%r fraicheur=%s titre=%r" % (c["une_outlet"], c["une_fraicheur"], c["une_titre"]))
    print("                    cle=%r angle=%r" % (c["une_cle"], c["une_angle"]))
    for b in c["breves"]:
        print("  breve%s : pt=%s %-28r quartier=%-16r qd=%s %r" % (
            " VISEE" if b["visee"] else "      ", b["pastille"], b["descripteur"], b["quartier"],
            b["qd_couleur"], b["qd_mot"]))
    print("  CTA             : %r (classes supplementaires: %r)" % (c["cta"], c["cta_classes"]))
    print("  note            : %r" % c["note"])

print("\n" + "=" * 100)
print("APPARIEMENT pastille x mot de fraicheur, sur les %d breves des six cadres :" % len(pastilles))
from collections import Counter, defaultdict
par_mot = defaultdict(set)
for pt, mot, qdc, idx in pastilles:
    par_mot[mot].add(pt)
for mot in sorted(par_mot):
    print("  mot %-20r -> teintes de pastille %s" % (mot, sorted(par_mot[mot])))
teintes = sorted({p for p, _, _, _ in pastilles})
mots = sorted(par_mot)
print("  => %d mots de fraicheur dessines, %d teintes de pastille distinctes" % (len(mots), len(teintes)))
print("  COULEUR DU MOT (qd) par mot :")
par_mot_qd = defaultdict(set)
for pt, mot, qdc, idx in pastilles:
    par_mot_qd[mot].add(qdc)
for mot in sorted(par_mot_qd):
    print("    %-20r -> %s" % (mot, sorted(par_mot_qd[mot])))

print("\nCONTROLE E5 (compteur vs rendus, par cadre) :")
for idx in CADRES:
    c = res[idx]
    une_c, rue_c, enc_c = (int(v) for v, _ in c["compteurs"])
    ok = (une_c == c["nb_une_rendues"], rue_c == c["nb_breves_rendues"], enc_c == c["nb_evt_rendus"])
    print("  cadre %3d : a la une %02d vs %d %s | dans la rue %02d vs %d %s | en cours %02d vs %d %s" % (
        idx, une_c, c["nb_une_rendues"], "OK" if ok[0] else "ECART",
        rue_c, c["nb_breves_rendues"], "OK" if ok[1] else "ECART",
        enc_c, c["nb_evt_rendus"], "OK" if ok[2] else "ECART"))

styles = "".join(re.findall(r"<style>(.*?)</style>", PAGE, re.S))
print("\nCLASSE `visee` : %d breves marquees ; regle CSS `.jrn6 .brv.visee` presente : %s" % (
    sum(1 for c in res.values() for b in c["breves"] if b["visee"]),
    bool(re.search(r"\.jrn6 \.brv\.visee\s*\{", styles))))
print("  regle :", (re.search(r"\.jrn6 \.brv\.visee\s*\{([^}]*)\}", styles) or [None, "ABSENTE"])[1])

json.dump(res, open(os.path.join(OUT, "inventaire-M.json"), "w", encoding="utf-8"),
          indent=1, ensure_ascii=False, sort_keys=True)
print("\n-> inventaire-M.json ecrit")
