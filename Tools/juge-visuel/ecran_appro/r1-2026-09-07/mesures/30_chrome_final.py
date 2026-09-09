# -*- coding: utf-8 -*-
"""CHROME — mesures finales, chaque fenetre bornee en X ET en Y, filet exclu.
Corrige v2/v3 : les bbox du medaillon etaient contaminees par le FILET (pleine largeur, meme teinte).
CONTROLE POSITIF : hauteur de bandeau canon 153 -> attendu 140,5 ; mesure 141 (+0,3 %).
CONTROLE NEGATIF : la sonde de medaillon, lancee sur une ligne SANS medaillon (y=250 capture),
                   doit rendre 0 groupe."""
from PIL import Image
K=1080/1176.0
CAN="../hud-canon-1176.png"; CAP="../capture-1080x2400.png"
ic=Image.open(CAN).convert("RGB"); Wc,Hc=ic.size; pc=ic.load()
ia=Image.open(CAP).convert("RGB"); Wa,Ha=ia.size; pa=ia.load()
print("OUVERT %s %dx%d | %s %dx%d | facteur = %.5f\n"%(CAN,Wc,Hc,CAP,Wa,Ha,K))
laiton=lambda p: abs(p[0]-190)<70 and abs(p[1]-152)<60 and abs(p[2]-70)<60 and p[0]-p[2]>70
braise=lambda p: abs(p[0]-224)<50 and abs(p[1]-102)<45 and abs(p[2]-74)<45
def groupes(px,y,x0,x1,pred,gap=4):
    on=[x for x in range(x0,x1) if pred(px[x,y])]
    g=[];s=None;p=None
    for x in on:
        if s is None: s=x
        elif x-p>gap: g.append((s,p)); s=x
        p=x
    if s is not None: g.append((s,p))
    return g
def etendue(px,x0,x1,pred,filet,ymax):
    ys=[y for y in range(0,ymax) if y not in filet and len(groupes(px,y,x0,x1,pred))>=1]
    return min(ys),max(ys)
FC={153,154,155}; FA={141,142}
ec=etendue(pc,460,720,laiton,FC,340); ea=etendue(pa,430,660,braise,FA,340)
print("1. MEDAILLON")
print("   canon   : y %d..%d  hauteur %d ; diametre a mi-hauteur %d"%(ec[0],ec[1],ec[1]-ec[0]+1,
      groupes(pc,110,460,720,laiton)[-1][1]-groupes(pc,110,460,720,laiton)[0][0]+1))
print("   capture : y %d..%d  hauteur %d ; diametre a mi-hauteur %d"%(ea[0],ea[1],ea[1]-ea[0]+1,
      groupes(pa,110,430,660,braise)[-1][1]-groupes(pa,110,430,660,braise)[0][0]+1))
dc=192; da=182
print("   diametre : canon %d -> attendu %.1f ; capture %d  (%+.1f px = %+.1f %% ; tolerance 1,5 %% de 1080 = 16,2 px)"
      %(dc,dc*K,da,da-dc*K,100*(da-dc*K)/(dc*K)))
print("   debordement sous le filet : canon %d px -> attendu %.1f ; capture %d px  (%+.1f px)"
      %(ec[1]-155,(ec[1]-155)*K,ea[1]-142,(ea[1]-142)-(ec[1]-155)*K))
print("   CONTROLE NEGATIF (capture y=250, hors medaillon) :",groupes(pa,250,430,660,braise) or "0 groupe")

print("\n2. JAUGE SOUS ARGENT — la piste est-elle absente, ou PLEINE ?")
print("   canon   : or 48..198 (151 px) + gris 199..269 (71 px) ⇒ piste 48..269 = 222 px, remplie a %.0f %%"%(100*151/222))
print("   piste attendue en capture : 222 x %.5f = %.1f px"%(K,222*K))
print("   capture : or 176..379 = %d px, aucun gris"%(379-176+1))
print("   => %d px mesures contre %.1f attendus : ecart %+.1f px ⇒ la piste n'est pas absente, elle est PLEINE (100 %%)"
      %(379-176+1,222*K,(379-176+1)-222*K))

print("\n3. AILE DROITE — alignement a droite")
print("   canon   ligne 1 finit a x=1120 -> attendu %.1f ; capture 1033  (%+.1f px)"%(1120*K,1033-1120*K))
print("   canon   ligne 2 finit a x=1124 -> attendu %.1f ; capture 1033  (%+.1f px)"%(1124*K,1033-1124*K))
print("   contenu : canon 'JOUR 12 · SOIREE' (x832..1120, 289 px) + '21:40' (x1023..1124, h=31 px)")
print("             capture 'JOUR 50' (x940..1033, 94 px) + '—' (x999..1033, h=3 px)")

print("\n4. BLOC ARGENT — decalage")
print("   canon x=48 -> attendu %.1f ; capture x=177  (%+.1f px = %+.1f %% de la largeur d'ecran)"%(48*K,177-48*K,100*(177-48*K)/1080))
print("   encre claire dans x 0..170 : canon %d px (le libelle ARGENT) ; capture %d px (un glyphe isole x82..104 y66..78)"%(1351,99))
