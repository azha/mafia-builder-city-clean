# m06 — couleurs : mediane d'une fenetre (>=3px de tout bord), sur aplats homologues
# Controle positif : le liseré REF doit rendre #2a3648 = (42,54,72) (valeur ecrite dans la CSS)
# Controle negatif : deux fenetres qu'on SAIT differentes (fond de boite REF vs fond noir CAP) doivent differer
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def med(px,x,y,w=11,h=7):
    vs=[[],[],[]]
    for dx in range(-w//2,w//2+1):
        for dy in range(-h//2,h//2+1):
            p=px[x+dx,y+dy]
            for i in range(3): vs[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in vs)
def hx(c): return "#%02x%02x%02x"%c
def maxi(px,x0,x1,y0,y1):
    """pixel le plus lumineux d'une fenetre = couleur du texte au coeur du glyphe"""
    best=None;bl=-1
    for x in range(x0,x1):
        for y in range(y0,y1):
            p=px[x,y]; l=0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
            if l>bl: bl=l;best=p
    return best
print("\n### CONTROLE POSITIF")
print("  REF liseré x=51,y=700 :",med(pr,51,700,3,3),hx(med(pr,51,700,3,3)),"  attendu #2a3648")
print("\n### FONDS (mediane 11x7)")
print("  REF fond enseigne   x=150 y=530 :",hx(med(pr,150,530)))
print("  CAP fond enseigne   x=150 y=300 :",hx(med(pc,150,300)))
print("  REF fond fen(compteur) x=100 y=700:",hx(med(pr,100,700)))
print("  CAP fond fen(compteur) x=80  y=500:",hx(med(pc,80,500)))
print("  REF fond pann       x=150 y=1700:",hx(med(pr,150,1700)))
print("  CAP fond pann       x=150 y=1820:",hx(med(pc,150,1820)))
print("  REF fond page (bln6, hors boite) x=540 y=666 :",hx(med(pr,540,666)))
print("  CAP fond page                    x=540 y=1200:",hx(med(pc,540,1200)))
print("  REF fond page bas x=540 y=2060 :",hx(med(pr,540,2060)))
print("  CAP fond page bas x=540 y=2150 :",hx(med(pc,540,2150)))
print("\n### TEXTES (pixel le plus lumineux du glyphe)")
print("  REF titre or        :",hx(maxi(pr,326,740,505,565)),"   attendu #f2c96b")
print("  CAP titre or        :",hx(maxi(pc,344,735,296,342)))
print("  REF sous-titre      :",hx(maxi(pr,283,787,583,612)),"  attendu #b9ad92")
print("  CAP sous-titre      :",hx(maxi(pc,302,779,369,398)))
print("  REF chiffre compteur:",hx(maxi(pr,168,239,698,742)),"  attendu #7fd4d9")
print("  CAP chiffre compteur:",hx(maxi(pc,127,229,483,535)))
print("  REF libelle compteur:",hx(maxi(pr,157,251,755,777)),"  attendu #8a979c")
print("  CAP libelle compteur:",hx(maxi(pc,127,229,543,565)))
print("  REF pann kicker <i> :",hx(maxi(pr,80,600,1660,1690)),"  attendu #8a979c")
print("  CAP pann kicker <i> :",hx(maxi(pc,80,700,1820,1850)))
print("  REF pann titre <b>  :",hx(maxi(pr,80,1000,1700,1770)),"  attendu #eae0c8")
print("  CAP pann titre <b>  :",hx(maxi(pc,80,900,1860,1920)))
print("  REF pann corps <small>:",hx(maxi(pr,80,1000,1790,1830)),"attendu #b9ad92")
print("  CAP pann corps      :",hx(maxi(pc,80,1000,1930,1990)))
print("\n### CONTROLE NEGATIF (doivent differer)")
a=med(pr,150,530); b=med(pc,540,1200)
print("  REF fond enseigne",hx(a)," vs CAP fond page",hx(b)," -> delta max canal =",max(abs(a[i]-b[i]) for i in range(3)))
