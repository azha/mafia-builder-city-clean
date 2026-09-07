#!/usr/bin/env python3
# m08 — hauteur de CAPITALE, mesuree sur l'ENCRE, dans une fenetre x choisie pour
#       ne contenir que des capitales SANS accent ni jambage.
# Rappel : cet ecran ne demande que 'DejaVu Sans' (13 regles) et 'DejaVu Serif'
#       (5 regles), toutes deux presentes sur la machine de rendu ET embarquees par
#       le client => AUCUNE substitution : la hauteur ET la chasse sont comparables.
# Controle positif : la hauteur de capitale du sous-titre de la REFERENCE doit
#       valoir 7px CSS x 0,729 (capHeight DejaVu) x 3,6 = 18,4 px, a +-1,5 px.
# Controle negatif : le titre (12px) doit rendre une valeur NETTEMENT superieure.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)

def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def encre(im, x0,y0,x1,y1, clair_sur_sombre=True, marge=0.45):
    """bbox de l'encre : luminance a plus de 45% du chemin entre fond et extreme"""
    px=im.load(); vals=[]
    for y in range(y0,y1):
        for x in range(x0,x1): vals.append(L(px[x,y]))
    lo,hi=min(vals),max(vals)
    if hi-lo<12: return None,(lo,hi)
    s = lo+(hi-lo)*marge
    ys=[];xs=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            v=L(px[x,y])
            ok = v>=s if clair_sur_sombre else v<=s
            if ok: ys.append(y);xs.append(x)
    if not ys: return None,(lo,hi)
    return (min(xs),min(ys),max(xs),max(ys)),(lo,hi)

def mes(nom, im, box, clair=True, attendu=None):
    bb,(lo,hi)=encre(im,*box,clair_sur_sombre=clair)
    if bb is None:
        print(f"  {nom:44s} : PAS D'ENCRE (L {lo:.0f}..{hi:.0f})"); return None
    h=bb[3]-bb[1]+1; w=bb[2]-bb[0]+1
    att = f"  attendu~{attendu:.1f}px" if attendu else ""
    print(f"  {nom:44s} : h={h:3d} px = {h/3.6:5.2f} CSS   w={w:4d} px   bbox={bb}{att}")
    return h

R=0.729  # capHeight/em de DejaVu Sans et DejaVu Serif (identique)
print("\n--- CONTROLES (REFERENCE) ---")
mes("CTRL+ sous-titre p 7px  -> 'O' de 'On choisit'", REF,(48,515,80,545), True, 7*R*3.6)
mes("CTRL- titre h3 12px     -> 'L' de \"L'envoi\"",   REF,(48,455,78,505), True, 12*R*3.6)

print("\n--- REFERENCE (cadre #54) : hauteurs de capitale ---")
mes("titre h3  700 12px DejaVu Serif  ('L')",        REF,(48,452,78,505), True, 12*R*3.6)
mes("sous-titre p 7px DejaVu Sans     ('O')",        REF,(48,515,80,548), True, 7*R*3.6)
mes(".fiche b 700 9px Serif  ('A' d'Atelier)",       REF,(82,712,120,760), False, 9*R*3.6)
mes(".fiche i 6.2px Sans caps ('D' de D'OU)",        REF,(85,765,105,795), False, 6.2*R*3.6)
mes(".lecture u 6.6px caps ('LE' de LE CHEMIN)",     REF,(50,1465,105,1500), True, 6.6*R*3.6)
mes(".lecture b 700 8.2px ('d' droite -> mot)",      REF,(690,1455,1035,1500), True, 8.2*R*3.6)
mes(".nom 700 10px Serif ('L' de Lt. Rin)",          REF,(196,1716,224,1760), True, 10*R*3.6)
mes(".role 6.5px caps ('LA' de LA REGULATION)",      REF,(196,1770,240,1800), True, 6.5*R*3.6)
mes(".geste b 700 9.5px caps ('ENV')",               REF,(88,1965,180,2005), True, 9.5*R*3.6)
mes(".geste small 6.5px ('a pied')",                 REF,(596,1975,700,2000), True, 6.5*R*3.6)

print("\n--- CAPTURE : hauteurs de capitale (memes elements) ---")
mes("titre  ('C' de C'est livre)",                   CAP,(48,278,92,340), True, 12*R*3.6)
mes("sous-titre ('L' de La marchandise)",            CAP,(48,400,78,440), True, 7*R*3.6)
mes(".fiche b ('L' de L'entrepot)",                  CAP,(133,595,160,640), False, 9*R*3.6)
mes(".fiche i ('D' de D'OU)",                        CAP,(133,645,152,672), False, 6.2*R*3.6)
mes(".lecture u ('LE' de LE CHEMIN)",                CAP,(48,978,105,1012), True, 6.6*R*3.6)
mes(".lecture b (mot 'droit' a droite)",             CAP,(630,975,1030,1015), True, 8.2*R*3.6)
mes(".nom ('D' de Dima)",                            CAP,(178,1712,208,1760), True, 10*R*3.6)
mes(".role ('LA' de LA REGULATION)",                 CAP,(178,1765,222,1795), True, 6.5*R*3.6)
mes("CTA b ('TE' de TENDRE)",                        CAP,(115,1955,175,1995), False, 9.5*R*3.6)
mes("legende ('a pied')",                            CAP,(48,2065,140,2095), True, 6.5*R*3.6)
mes("VOS COURRIERS (titre de section, EN TROP)",     CAP,(48,1210,110,1245), True, None)
