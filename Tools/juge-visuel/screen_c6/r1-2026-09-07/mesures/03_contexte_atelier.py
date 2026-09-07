# -*- coding: utf-8 -*-
"""Contexte des rares hits trouves dans l'atelier : dans quel CADRE tombent-ils ?"""
import io, re
SRC="/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html"
b=io.open(SRC,encoding="utf-8").read()
print("lu :", SRC, len(b))
# index de debut de chaque cadre
starts=[m.start() for m in re.finditer(r'<div class="cadre">', b)]
def cadre_de(pos):
    n=-1
    for i,s in enumerate(starts):
        if s<=pos: n=i
        else: break
    return n
for m in ("ce n'est pas une panne","palier 2","rien à l'horizon","ce que le serveur envoie vraiment"):
    low=b.lower(); k=0; i=0
    print("\n### motif %r" % m)
    while True:
        i=low.find(m.lower(), i)
        if i<0: break
        k+=1
        print("   hit %d  cadre #%d  ...%s..." % (k, cadre_de(i), b[max(0,i-90):i+90].replace("\n"," ")))
        i+=1
    if k==0: print("   aucun")
