# -*- coding: utf-8 -*-
"""Decoupes agrandies (x2) pour LIRE les libelles a l'oeil — la transcription des textes est
porteuse (le SENS de l'etat vide se juge sur les mots)."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
print("source :", cap.size)
Z=[("crop_enseigne", (40,270,1040,470)),
   ("crop_bloc_paliers", (60,690,1030,1080)),
   ("crop_pave_bas", (40,1845,1040,2115))]
for n,(a,b,c,d) in Z:
    im=cap.crop((a,b,c,d))
    im=im.resize((im.size[0]*2, im.size[1]*2), Image.LANCZOS)
    p=os.path.join(D,n+".png"); im.save(p)
    print("  %-20s %s -> %s %s" % (n,(a,b,c,d),p,im.size))
