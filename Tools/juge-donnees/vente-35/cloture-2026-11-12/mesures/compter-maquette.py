#!/usr/bin/env python3
# Compte les porteurs d'information des cadres 107..112, element par element.
# Aucun chiffre lu a l'oeil : tout ce qui decide est un compte.
import re
import glob
import os

D = os.path.dirname(os.path.abspath(__file__))
DIV = re.compile(r"</?div\b[^>]*>")


def bloc(frag, start):
    depth = 0
    for m in DIV.finditer(frag, start):
        depth += 1 if not m.group(0).startswith("</") else -1
        if depth == 0:
            return frag[start:m.end()]
    raise AssertionError("bloc non ferme")


for path in sorted(glob.glob(D + "/M-cadre-1*.html")):
    frag = open(path, encoding="utf-8").read()
    idx = os.path.basename(path).split("-")[2].split(".")[0]
    etq = re.search(r'<div class="etiquette">(.*?)</div>', frag, re.S).group(1)
    print("\n===== cadre %s — %s" % (idx, re.sub(r"<[^>]+>", "", etq)))
    # l'enseigne
    ens = re.search(r'<div class="enseigne">(.*?)</div></div>', frag, re.S)
    print("  enseigne : %s" % re.sub(r"<[^>]+>", " | ", re.search(r'<div class="enseigne">(.*?)<div class="compteurs">', frag, re.S).group(1)).strip())
    # les trois compteurs
    fens = re.findall(r'<div class="fen">(.*?)</div>\s*(?=<div class="fen">|</div>)', frag, re.S)
    fens = re.findall(r'<div class="fen"><b>(.*?)</b><span>(.*?)</span></div>', frag, re.S)
    print("  compteurs (%d) : %s" % (len(fens), " ; ".join("%s = %s" % (re.sub(r"<[^>]+>", "", v).strip(), l) for v, l in fens)))
    # les rangees
    starts = [m.start() for m in re.finditer(r'<div class="dl[^"]*">', frag)]
    print("  rangees .dl : %d" % len(starts))
    for s in starts:
        r = bloc(frag, s)
        cls = re.match(r'<div class="(dl[^"]*)">', r).group(1)
        nom = re.search(r'<div class="qui"><b>(.*?)</b>', r)
        small = re.search(r"<small>(.*?)<span class=\"marge\">", r, re.S)
        etat = re.search(r'<span class="et" style="color:(#[0-9a-f]{6})">(.*?)</span>', r)
        marge = re.findall(r'<u class="(off)?"></u>', r)
        jg = re.findall(r'<i style="background:(#[0-9a-f]{6});opacity:([0-9.]+)"></i>', r)
        allumes = sum(1 for c, o in jg if c != "#2a3648")
        print("    [%-13s] %-7s | %-48s | etat=%-9s | marge %d/%d | jauge %d/%d (teintes %s)"
              % (cls, nom.group(1) if nom else "?",
                 (small.group(1).strip() if small else "?"),
                 etat.group(2) if etat else "?",
                 sum(1 for m in marge if m != "off"), len(marge),
                 allumes, len(jg), ",".join(sorted(set(c for c, _ in jg)))))
    # le panneau de detail
    for m in re.finditer(r'<div class="pann"[^>]*>', frag):
        p = bloc(frag, m.start())
        print("    PANN : %s" % re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ¶ ", p)).strip()[:400])
    # etat vide, CTA, note
    for m in re.finditer(r'<div class="rien">(.*?)</div>', frag, re.S):
        print("    RIEN : %s" % re.sub(r"<[^>]+>", " ", m.group(1)).strip())
    for m in re.finditer(r'<span class="(cta6[^"]*)">(.*?)</span>', frag, re.S):
        print("    CTA  : [%s] %s" % (m.group(1), m.group(2)))
    for m in re.finditer(r'<div class="note6">(.*?)</div>', frag, re.S):
        print("    NOTE : %s" % re.sub(r"<[^>]+>", "", m.group(1)).strip())
    # la barre de shell
    barre = re.search(r'<div class="barre">(.*?)<div class="panneau">', frag, re.S)
    if barre:
        print("    BARRE(shell) : %s" % " | ".join(re.findall(r'<span class="(?:lib|val)">([^<]*)</span>', barre.group(1))))
