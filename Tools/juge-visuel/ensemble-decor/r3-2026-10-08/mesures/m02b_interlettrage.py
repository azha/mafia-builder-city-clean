"""m02b — INTERLETTRAGE + HAUTEUR DE CAPITALE, version a detection automatique de bande.

On donne un rect GENEREUX ; le script y cherche la bande de lignes porteuses d'encre la
plus haute (ou la n-ieme), puis mesure la bbox d'encre DANS cette bande. Il imprime :
  h  = hauteur de capitale (px image)  ;  w = largeur d'encre
  w/h = chasse+interlettrage normalises (invariant d'echelle)
  creux = largeurs des gouttieres entre glyphes (px image) -> l'interlettrage lui-meme
  creux/h = interlettrage normalise : LA grandeur comparable maquette <-> jeu

CONTROLE POSITIF : le mot « TENSION » de ⑭ fait 22 px de capitale des deux cotes ;
le mot « FAMILLE » du dock fait 18 px des deux cotes (verifie plus bas) => l'instrument
ne fabrique pas d'ecart de taille la ou il n'y en a pas.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def mesure(im, rect, fond, seuil=40, rang=0, etiquette="", mini=2):
    x0, y0, x1, y1 = rect
    prof = O.profil_lignes(im, x0, y0, x1, y1, fond, seuil)
    bds = [b for b in O.bandes(prof, mini) if b[2] >= 6]
    if len(bds) <= rang:
        print("   %-28s AUCUNE BANDE rang %d dans %s (bandes=%s)" % (etiquette, rang, rect, bds))
        return None
    by0, by1, h = bds[rang]
    bb = O.bbox_encre(im, x0, by0, x1, by1 + 1, fond, seuil)
    mnx, mny, mxx, mxy, n = bb
    w = mxx - mnx + 1
    px = im.load()
    creux, cur = [], 0
    for x in range(mnx, mxx + 1):
        vide = all(O.dist(px[x, y], fond) <= seuil for y in range(mny, mxy + 1))
        if vide:
            cur += 1
        else:
            if cur:
                creux.append(cur)
            cur = 0
    moy = sum(creux) / len(creux) if creux else 0.0
    print("   %-28s y=%d..%d h=%d w=%d w/h=%.3f creux=%s moy=%.1f moy/h=%.3f"
          % (etiquette, mny, mxy, h, w, w / h, creux, moy, moy / h))
    return {"h": h, "w": w, "wh": w / h, "creux": creux, "moy": moy, "mh": moy / h}


CAS = [
    # (titre, (fichier_ref, rect, fond, rang), (fichier_cap, rect, fond, rang))
    ("TEMOIN SUBSTITUTION — HUD « ARGENT »",
     ("E03-cadre-48.png", (40, 35, 260, 75), (10, 14, 22), 0),
     ("E03_Chanedappro_1080x2400.png", (40, 18, 260, 55), (12, 21, 28), 0)),
    ("TEMOIN SUBSTITUTION — HUD « CHALEUR »",
     ("E03-cadre-48.png", (440, 185, 640, 232), (16, 24, 40), 0),
     ("E03_Chanedappro_1080x2400.png", (390, 122, 600, 165), (16, 24, 40), 0)),
    ("E01 sous-titre « CE QUI SE DIT CE MATIN »",
     ("E01-cadre-125.png", (260, 545, 800, 600), (16, 22, 36), 0),
     ("E01_Journal_1080x2400.png", (290, 640, 800, 700), (16, 22, 36), 0)),
    ("E10 libelle compteur « ETAPES »",
     ("E10-cadre-140-pas-encore-de-filiere.png", (120, 748, 300, 790), (16, 22, 36), 0),
     ("E10_Filire_1080x2400.png", (120, 805, 300, 850), (16, 22, 36), 0)),
    ("E10 chiffre compteur « 00 »",
     ("E10-cadre-140-pas-encore-de-filiere.png", (140, 688, 270, 748), (16, 22, 36), 0),
     ("E10_Filire_1080x2400.png", (140, 750, 270, 812), (16, 22, 36), 0)),
    ("E10 sous-titre de bandeau",
     ("E10-cadre-140-pas-encore-de-filiere.png", (200, 578, 880, 620), (16, 22, 36), 0),
     ("E10_Filire_1080x2400.png", (240, 638, 840, 682), (16, 22, 36), 0)),
    ("E08 plaque « TENSION »",
     ("E08-cadre-18-au-calme.png", (420, 1605, 650, 1650), (196, 160, 80), 0),
     ("E08_Lasemaine_1080x2400.png", (420, 1275, 650, 1320), (196, 160, 80), 0)),
    ("E08 legende « CALME — VOS AFFAIRES RESPIRENT »",
     ("E08-cadre-18-au-calme.png", (160, 1680, 990, 1725), (58, 63, 72), 0),
     ("E08_Lasemaine_1080x2400.png", (190, 1355, 970, 1400), (46, 51, 60), 0)),
    ("E07 titre « LA VITRINE »",
     ("E07-cadre-98.png", (40, 480, 420, 530), (30, 24, 20), 0),
     ("E07_Boutique_1080x2400.png", (35, 555, 420, 605), (30, 24, 20), 0)),
    ("E07 rubrique « LES EXTRAS — PAYES EN MARKS »",
     ("E07-cadre-98.png", (30, 640, 700, 690), (12, 17, 28), 0),
     ("E07_Boutique_1080x2400.png", (25, 695, 700, 740), (13, 18, 30), 0)),
    ("A01 eyebrow « LA SUITE » (encre seule, sans le souligne)",
     ("A01-cadre-4-la-suite.png", (440, 862, 640, 890), (12, 18, 30), 0),
     ("A01_AccueilFile2Cartes_1080x2400.png", (440, 962, 640, 996), (12, 18, 30), 0)),
    ("dock « FAMILLE »",
     ("A01-cadre-4-la-suite.png", (370, 2030, 520, 2070), (10, 14, 24), 0),
     ("A01_AccueilFile2Cartes_1080x2400.png", (370, 2315, 520, 2355), (10, 14, 24), 0)),
    ("A01 « PORTEE » (cadre 5 / planche TeteRaisonLongue)",
     ("A01-cadre-5-tete-sur-ligne-haute.png", (200, 1005, 330, 1040), (12, 18, 30), 0),
     ("A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png", (210, 1450, 360, 1490), (12, 18, 30), 0)),
]

print("=== m02b INTERLETTRAGE / HAUTEUR DE CAPITALE ===")
for titre, (fr, rr, fondr, rgr), (fc, rc, fondc, rgc) in CAS:
    print(" " + titre)
    ir = O.ref(fr); ic = O.cap(fc)
    x = mesure(ir, rr, fondr, 40, rgr, "REF")
    y = mesure(ic, rc, fondc, 40, rgc, "JEU")
    if x and y:
        print("   => capitale %d -> %d px (%+.1f%%) | interlettrage/h %.3f -> %.3f (%+.1f%%)"
              % (x["h"], y["h"], 100 * (y["h"] / x["h"] - 1),
                 x["mh"], y["mh"], (100 * (y["mh"] / x["mh"] - 1)) if x["mh"] else float('nan')))
    print()
