# m08 — details : encre reelle, bordures manquantes, chiffres compteurs, structure du pann
# Controle positif : REF doit compter >=1 ligne doree pleine largeur sous l'enseigne (border-bottom 2px #b08d3e)
# Controle negatif : la meme sonde sur une ligne connue sans or (REF y=750) doit rendre 0
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def hx(c): return "#%02x%02x%02x"%c
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

print("\n### 1. Bordure basse doree de l'enseigne (#b08d3e = (176,141,62))")
def compte_or_ligne(px,y,x0,x1):
    return sum(1 for x in range(x0,x1) if abs(px[x,y][0]-176)<28 and abs(px[x,y][1]-141)<28 and abs(px[x,y][2]-62)<34)
print("  REF sous l'enseigne, y=636..652 :", [(y,compte_or_ligne(pr,y,60,1020)) for y in range(636,653,2)])
print("  CAP sous l'enseigne, y=418..440 :", [(y,compte_or_ligne(pc,y,60,1020)) for y in range(418,441,2)])
print("  CTRL- REF y=750 (aucun or attendu) :", compte_or_ligne(pr,750,60,1020))

print("\n### 2. Cadre dore (cerne) autour du panneau")
def or_colonne(px,x,y0,y1):
    return sum(1 for y in range(y0,y1) if abs(px[x,y][0]-176)<30 and abs(px[x,y][1]-141)<30 and abs(px[x,y][2]-62)<36)
print("  REF colonne x=22 (bord gauche cerne), y=460..2070 :",or_colonne(pr,22,460,2070),"/",2070-460)
print("  CAP colonne x=22, y=270..2110 :",or_colonne(pc,22,270,2110),"/",2110-270)
print("  CAP colonne x=46 (bord gauche des boites), y=270..2110 :",or_colonne(pc,46,270,2110),"/",2110-270)

print("\n### 3. Liseré #2a3648 autour des boites de la capture ?")
def compte_lisere(px,y,x0,x1):
    return sum(1 for x in range(x0,x1) if max(abs(px[x,y][i]-(42,54,72)[i]) for i in range(3))<=16)
print("  REF y=679 (bord haut compteurs) :",compte_lisere(pr,679,40,1040))
print("  CAP y=460 (bord haut compteurs) :",compte_lisere(pc,460,40,1040))
print("  CAP y=461 :",compte_lisere(pc,461,40,1040)," y=459 :",compte_lisere(pc,459,40,1040))

print("\n### 4. Chiffres des compteurs — hauteur de capitale (fenetre serree)")
def ink_bbox(px,x0,x1,y0,y1,fond,tol):
    cols=[];rows=[]
    for x in range(x0,x1):
        for y in range(y0,y1):
            if max(abs(px[x,y][i]-fond[i]) for i in range(3))>tol: cols.append(x);rows.append(y)
    if not cols: return None
    return (min(cols),max(cols),min(rows),max(rows))
b=ink_bbox(pr,150,260,690,748,(11,17,25),30); print("  REF '04' bbox",b,"h=",b[3]-b[2]+1,"w=",b[1]-b[0]+1)
b2=ink_bbox(pc,100,250,470,538,(22,22,28),30); print("  CAP '00' bbox",b2,"h=",b2[3]-b2[2]+1,"w=",b2[1]-b2[0]+1)

print("\n### 5. Encre REELLE (luminance > 40 : au-dessus des deux aplats #0d0d0d=13 et #16161c=22)")
def encre(px,box,tag):
    x0,y0,x1,y1=box; n=0;tot=0
    for y in range(y0,y1,2):
        for x in range(x0,x1,2):
            tot+=1
            if L(px[x,y])>40: n+=1
    print("  %-32s %6.2f%%  (%d/%d)"%(tag,100.0*n/tot,n,tot))
encre(pr,(3,434,1077,2096),"REF contenu (bln6)")
encre(pc,(0,143,1080,2160),"CAP contenu (bandeau->dock)")
encre(pr,(50,824,1030,1596),"REF zone chaine (elast)")
encre(pc,(46,618,1034,1783),"CAP zone homologue (le vide)")

print("\n### 6. Structure verticale comparee (px, meme echelle x3,6)")
print("  REF : enseigne 481..647 (h=167) | compteurs 679..792 (h=114) | elast 825..1596 (h=772) | pann 1630..1869 (h=240) | cta 1902..1995 (h=94)")
print("  CAP : enseigne 267..426 (h=160) | compteurs 460..617 (h=158) | VIDE  618..1783 (h=1166) | pann 1784..2115 (h=332) | cta ABSENT")
