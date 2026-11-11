#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend un cadre lisible : une ligne par balise, indentee, avec le texte NU.

Ne saute aucune balise vide (<br>, <i/>, <path/>) : elles sont imprimees mais
n'ouvrent pas de niveau (lecon « parseur de maquette : balises vides »).
Les <svg> sont replies en une ligne (contenu non informatif pour le juge
donnees, sauf le compte de leurs enfants, qui est imprime).
"""
import re
import sys

VOID = {"br", "hr", "img", "input", "meta", "link", "source", "use", "path",
        "circle", "rect", "line", "polyline", "polygon", "ellipse", "stop",
        "area", "base", "col", "embed", "param", "track", "wbr"}
TAG = re.compile(r"<(/?)([a-zA-Z][-a-zA-Z0-9]*)((?:\"[^\"]*\"|'[^']*'|[^>\"'])*?)(/?)>")


def attrs(raw):
    out = []
    for m in re.finditer(r"([-a-zA-Z0-9:]+)\s*=\s*\"([^\"]*)\"", raw):
        k, v = m.group(1), m.group(2)
        if k in ("class", "style", "id", "data-etat", "aria-label", "role", "title"):
            out.append("%s=%r" % (k, v))
    return " ".join(out)


def main(path):
    s = open(path, encoding="utf-8").read()
    depth = 0
    pos = 0
    svg_depth = None
    svg_kids = 0
    for m in TAG.finditer(s):
        text = s[pos:m.start()]
        pos = m.end()
        t = re.sub(r"\s+", " ", text).strip()
        if t and svg_depth is None:
            print("%s| %s" % ("  " * depth, t))
        closing, name, raw, selfclose = m.group(1), m.group(2).lower(), m.group(3), m.group(4)
        if svg_depth is not None:
            if name == "svg" and closing:
                svg_depth -= 1
                if svg_depth == 0:
                    print("%s</svg> (%d enfants)" % ("  " * depth, svg_kids))
                    svg_depth = None
                    continue
            elif name == "svg" and not closing:
                svg_depth += 1
            elif not closing:
                svg_kids += 1
            continue
        if name == "svg" and not closing and not selfclose:
            print("%s<svg %s" % ("  " * depth, attrs(raw)))
            svg_depth = 1
            svg_kids = 0
            continue
        if closing:
            depth = max(0, depth - 1)
            print("%s</%s>" % ("  " * depth, name))
        elif selfclose or name in VOID:
            print("%s<%s %s/>" % ("  " * depth, name, attrs(raw)))
        else:
            print("%s<%s %s" % ("  " * depth, name, attrs(raw)))
            depth += 1
    t = re.sub(r"\s+", " ", s[pos:]).strip()
    if t:
        print("| %s" % t)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print("######## %s" % p)
        main(p)
