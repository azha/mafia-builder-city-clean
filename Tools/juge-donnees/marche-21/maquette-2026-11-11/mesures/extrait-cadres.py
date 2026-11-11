#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Indexe les cadres de la maquette (0-based) et extrait ceux qu'on demande.

Usage:
  extrait-cadres.py index                 -> idx<TAB>etiquette (tous)
  extrait-cadres.py dump <idx> [<idx>...] -> ecrit cadre-<idx>.html dans le meme dossier

Le decoupage ne se fie pas a html.parser (balises vides, cf. lecon « parseur de
maquette ») : il compte les <div ...> et </div> sur le texte brut.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "maquette-4ae50cca.html")

OPEN_CADRE = '<div class="cadre">'
DIV_OPEN = re.compile(r"<div\b", re.I)
DIV_CLOSE = re.compile(r"</div\s*>", re.I)
ETIQ = re.compile(r'<div class="etiquette">(.*?)</div>', re.S)


def cadres(text):
    """Retourne la liste [(idx, debut, fin, etiquette)] des cadres, 0-based."""
    out = []
    for i, m in enumerate(re.finditer(re.escape(OPEN_CADRE), text)):
        start = m.start()
        # brace matching sur les div
        depth = 0
        pos = start
        end = None
        while pos < len(text):
            o = DIV_OPEN.search(text, pos)
            c = DIV_CLOSE.search(text, pos)
            if c is None:
                break
            if o is not None and o.start() < c.start():
                depth += 1
                pos = o.end()
            else:
                depth -= 1
                pos = c.end()
                if depth == 0:
                    end = pos
                    break
        if end is None:
            end = len(text)
        body = text[start:end]
        em = ETIQ.search(body)
        etiq = em.group(1).strip() if em else "(SANS ETIQUETTE)"
        out.append((i, start, end, etiq, body))
    return out


def main():
    text = open(SRC, encoding="utf-8").read()
    cs = cadres(text)
    if not sys.argv[1:] or sys.argv[1] == "index":
        print("TOTAL\t%d" % len(cs))
        for i, s, e, etiq, body in cs:
            print("%d\t%d\t%s" % (i, e - s, etiq))
        return 0
    if sys.argv[1] == "dump":
        want = {int(x) for x in sys.argv[2:]}
        for i, s, e, etiq, body in cs:
            if i in want:
                p = os.path.join(HERE, "cadre-%03d.html" % i)
                with open(p, "w", encoding="utf-8") as f:
                    f.write(body)
                print("%d\t%d octets\t%s\t%s" % (i, len(body.encode("utf-8")), p, etiq))
        return 0
    print("usage: index | dump <idx>...", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
