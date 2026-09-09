# -*- coding: utf-8 -*-
"""Oracle texte : compte les OCCURRENCES (pas les lignes) de motifs dans chaque cadre,
et extrait le texte visible de chaque cadre du groupe 113-118.
Controle POSITIF : 'jetons' doit sortir >0 sur 113 et 116 (les cartes portent un cout).
Controle NEGATIF : 'jetons' doit sortir 0 sur 117 (etat vide, aucune carte)."""
import io, re, os, html
D = os.path.dirname(os.path.abspath(__file__))

def visible(s):
    s = re.sub(r'<style.*?</style>', ' ', s, flags=re.S)
    s = re.sub(r'<svg.*?</svg>', ' ', s, flags=re.S)
    s = re.sub(r'<[^>]+>', '\n', s)
    s = html.unescape(s)
    return [l.strip() for l in s.split('\n') if l.strip()]

MOTIFS = ["palier", "Palier", "serveur", "jetons", "échelle", "chelle des paliers",
          "Rien ne s", "horizon se remplit", "pourquoi c", "viennent du monde"]
print("%-10s %s" % ("motif", "  ".join("c%d"%n for n in (113,114,115,116,117,118))))
src = {n: io.open(os.path.join(D,"cadre_%d.html"%n), encoding="utf-8").read() for n in (113,114,115,116,117,118)}
for m in MOTIFS:
    print("%-22s %s" % (repr(m), "  ".join("%4d"%src[n].count(m) for n in (113,114,115,116,117,118))))
print()
print("CONTROLE POSITIF 'jetons' c113=%d c116=%d  (attendu >0)" % (src[113].count("jetons"), src[116].count("jetons")))
print("CONTROLE NEGATIF 'jetons' c117=%d           (attendu 0)"  % src[117].count("jetons"))
print()
for n in (117,):
    print("=== texte VISIBLE du cadre %d (l'homologue de l'etat vide) ===" % n)
    for l in visible(src[n]): print("   ", l)
