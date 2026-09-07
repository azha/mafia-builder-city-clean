# -*- coding: utf-8 -*-
"""TEXTE : dans une fenetre donnee, isole les GLYPHES (clusters de colonnes encrees) et rend,
pour chacun, sa bbox d'encre. La HAUTEUR DE CAPITALE se lit sur le PREMIER glyphe quand c'est une
capitale ('L' des deux cotes). Seuil = fond + 28 de luminance, mesure sur l'encre reelle.
CONTROLE POSITIF : sur la REFERENCE, le 'L' de 'L’horizon' doit rendre ~12,4 CSS
   (17px DejaVu Serif x hauteur de capitale 0,729 = 12,4) a +-1 CSS.
CONTROLE NEGATIF : la meme sonde sur une fenetre SANS texte doit rendre 0 glyphe."""
import os, sys
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def glyphes(im,x0,y0,x1,y1,marge=28,gap=3):
    px=im.load()
    fond=sorted(lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1))
    f=fond[len(fond)//4]      # quartile bas = fond
    seuil=f+marge
    colonnes=[]
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if lum(px[x,y])>=seuil]
        colonnes.append((min(ys),max(ys)) if ys else None)
    out=[];cur=None;vide=0
    for i,c in enumerate(colonnes):
        if c:
            vide=0
            if cur is None: cur=[x0+i,x0+i,c[0],c[1]]
            else: cur[1]=x0+i; cur[2]=min(cur[2],c[0]); cur[3]=max(cur[3],c[1])
        else:
            vide+=1
            if cur and vide>gap: out.append(tuple(cur)); cur=None
    if cur: out.append(tuple(cur))
    return out,f,seuil

def rapport(tag,f,fen,n=6):
    im=Image.open(os.path.join(R,f)).convert("RGB")
    g,fond,seuil=glyphes(im,*fen)
    print("  %-34s fenetre=%s  fond_lum=%.1f seuil=%.1f  %d glyphes" % (tag,fen,fond,seuil,len(g)))
    for a,b,t,d in g[:n]:
        print("        x=%4d..%4d  y=%4d..%4d  h=%3d px = %5.2f CSS  l=%3d px" % (a,b,t,d,d-t+1,(d-t+1)/S,b-a+1))
    if g:
        ymin=min(t for _,_,t,_ in g); ymax=max(d for _,_,_,d in g)
        print("        LIGNE ENTIERE : y=%d..%d  h=%d px = %.2f CSS ; x=%d..%d l=%d px = %.1f CSS"
              % (ymin,ymax,ymax-ymin+1,(ymax-ymin+1)/S, g[0][0],g[-1][1], g[-1][1]-g[0][0]+1, (g[-1][1]-g[0][0]+1)/S))
    return g

print("=== REFERENCE #113 ===")
REF="reference-1080x2102.png"
rapport("titre 'L’horizon'",           REF,(280,485,810,560))
rapport("sous-titre 'CE QUI S’OUVRE…'",REF,(180,585,900,615))
rapport("compteur 1 '02/5'",           REF,(120,690,270,740))
rapport("libelle 'A PORTEE'",          REF,(120,745,270,772))
rapport("CTA 'PRENDRE — 3 JETONS'",    REF,(300,1925,790,1975))
rapport("note 'ecarter une carte…'",   REF,(350,2020,740,2055))
print("  CONTROLE NEGATIF fenetre sans texte (ref y=770..800) :", len(glyphes(Image.open(os.path.join(R,REF)).convert("RGB"),300,770,700,800)[0]), "glyphes")

print()
print("=== CAPTURE etat-vide (ecran seul) ===")
CAP="capture-ecran-seul-etat-vide-1080x2400.png"
rapport("titre \"L'horizon\"",          CAP,(280,300,800,380))
rapport("sous-titre 'CE QUE LE SERVEUR…'",CAP,(180,390,900,420))
rapport("compteur 1 '00/0'",           CAP,(120,530,290,590))
rapport("libelle 'A PORTEE'",          CAP,(110,590,300,620))
rapport("bloc 'L’ECHELLE DES PALIERS'",CAP,(110,740,900,780))
rapport("pann i 'CE QUE LE SERVEUR…'", CAP,(75,1885,700,1915))
rapport("pann b 'Rien a l’horizon'",   CAP,(75,1925,520,1990))
rapport("pann small ligne 1",          CAP,(75,2000,1010,2030))
print("  CONTROLE NEGATIF fenetre sans texte (cap y=1200..1300) :", len(glyphes(Image.open(os.path.join(R,CAP)).convert("RGB"),300,1200,700,1300)[0]), "glyphes")
