# m16 — ESPACE DE MELANGE : pour chaque element TRANSLUCIDE de la CSS, on mesure le pixel RESULTANT
# des deux cotes et on le confronte aux deux predictions (sRGB et LINEAIRE) calculees sur le fond
# MESURE de chaque image. Un ecart systematique de meme signe = erreur de modele, pas N erreurs.
# CONTROLE : un element OPAQUE (le laiton plein du filet, le creme du texte) doit tomber a <=3/255
# sur les DEUX predictions (elles coincident a alpha=1) — sinon l'instrument est faux.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def s2l(v):
    v/=255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def l2s(v):
    v=max(0.0,min(1.0,v))
    return 255.0*(12.92*v if v<=0.0031308 else 1.055*v**(1/2.4)-0.055)
def pred_srgb(fg,a,bg): return tuple(round(fg[i]*a+bg[i]*(1-a)) for i in range(3))
def pred_lin(fg,a,bg):  return tuple(round(l2s(s2l(fg[i])*a+s2l(bg[i])*(1-a))) for i in range(3))
def cas(nom,fg,a,mes,bgR,bgC,mesR,mesC):
    pass
LIGNES=[]
def ligne(nom,fg,a,bgR,mesR,bgC,mesC):
    pR_s,pR_l=pred_srgb(fg,a,bgR),pred_lin(fg,a,bgR)
    pC_s,pC_l=pred_srgb(fg,a,bgC),pred_lin(fg,a,bgC)
    dR_s=max(abs(mesR[i]-pR_s[i]) for i in range(3)); dR_l=max(abs(mesR[i]-pR_l[i]) for i in range(3))
    dC_s=max(abs(mesC[i]-pC_s[i]) for i in range(3)); dC_l=max(abs(mesC[i]-pC_l[i]) for i in range(3))
    print(f'\n{nom}  (encre {fg} alpha {a})')
    print(f'   REF fond {bgR} mesure {mesR} | pred sRGB {pR_s} ecart {dR_s} | pred LIN {pR_l} ecart {dR_l}  -> {"sRGB" if dR_s<dR_l else "LIN"}')
    print(f'   JEU fond {bgC} mesure {mesC} | pred sRGB {pC_s} ecart {dC_s} | pred LIN {pC_l} ecart {dC_l}  -> {"sRGB" if dC_s<dC_l else "LIN"}')
    LIGNES.append((nom,'sRGB' if dR_s<dR_l else 'LIN','sRGB' if dC_s<dC_l else 'LIN',dR_s,dR_l,dC_s,dC_l))

# --- 1. CONTROLE : laiton OPAQUE du filet de tete (alpha 1) ---
mR=mediane(R,270,114.6,290,115.4); mC=mediane(C,270,128.4,290,129.2)
ligne('CONTROLE laiton opaque (filet, plateau)',(176,141,62),1.0,(0,0,0),mR,(0,0,0),mC)
# --- 2. contour de puce .chip.del  #7fd4d9 alpha 0x55/255=0.333 sur le degrade du rang ---
# bord GAUCHE de la puce : REF rang3 x~153.5 y~+66 ; JEU rang1 x~153.6 y~+68
bR=mediane(R,160,629.5+64,168,629.5+70); bC=mediane(C,160,264.3+66,168,264.3+72)
mR=mediane(R,153.2,629.5+62,154.2,629.5+72); mC=mediane(C,153.4,264.3+64,154.4,264.3+74)
ligne('contour de puce #7fd4d955',(127,212,217),0x55/255,bR,mR,bC,mC)
# --- 3. rail d'equipe .equipe::before #b08d3e55 sur le fond de feuille ---
bR=mediane(R,80,760,90,790); bC=mediane(C,80,800,90,830)
mR=mediane(R,72.6,760,74.4,790); mC=mediane(C,73.4,800,75.2,830)
ligne('rail d\'equipe #b08d3e55',(176,141,62),0x55/255,bR,mR,bC,mC)
# --- 4. bordure du bouton retour #ffffff26 sur le fond de tete ---
bR=mediane(R,15,55,22,60); bC=mediane(C,15,53,22,58)
mR=mediane(R,25.8,56.5,26.8,58.5); mC=mediane(C,25.4,54.7,26.4,56.7)
ligne('anneau du bouton retour #ffffff26',(255,255,255),0x26/255,bR,mR,bC,mC)
# --- 5. remplissage du bouton retour #ffffff08 ---
bR=mediane(R,110,45,150,62); bC=mediane(C,110,43,150,60)
mR=mediane(R,45,52,64,62); mC=mediane(C,45,50,64,60)
ligne('remplissage du bouton retour #ffffff08',(255,255,255),0x08/255,bR,mR,bC,mC)
print('\n==== SYNTHESE : quel modele gagne, par element ====')
for n,a,b,x1,x2,y1,y2 in LIGNES:
    print(f'  {n:44s} REF->{a:4s} (s{x1:3d}/l{x2:3d})   JEU->{b:4s} (s{y1:3d}/l{y2:3d})')
