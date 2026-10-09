"""m01 — le CHROME du HUD, sur les 12 écrans (captures 2400) et sur les cadres nominaux.

Grandeurs (toutes invariantes en Y, donc comparables entre 2102 / 2400 / 1920) :
  - hauteur de capitale d'« ARGENT » (c'est la grandeur que la garde de capture utilise)
  - largeur d'encre d'« ARGENT » => INTERLETTRAGE (largeur / hauteur de capitale)
  - disque du manomètre : diamètre extérieur de l'anneau d'or, épaisseur de l'anneau
  - filet d'or pleine largeur sous le bandeau : présent ? y ? épaisseur ?
  - losange ◆ sous le manomètre : présent ?

CONTROLE POSITIF : la largeur d'image (1080) est la même des deux côtés, et le facteur
x3,6 est le même ; on le vérifie en imprimant les tailles. Contrôle positif chiffré :
l'ordonnée du mot ARGENT doit tomber dans le bandeau haut des DEUX côtés.
CONTROLE NEGATIF : on mesure aussi « JOUR » dont on SAIT que le libellé diffère
(JOUR 1 / JOUR 12) — si l'instrument rendait ARGENT et JOUR identiques, il ne mesure rien.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O

CAPS_2400 = [
    ("A01", "A01_AccueilFile2Cartes_1080x2400.png"),
    ("A01t", "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png"),
    ("E01", "E01_Journal_1080x2400.png"),
    ("E02", "E02_Carnet_1080x2400.png"),
    ("E03", "E03_Chanedappro_1080x2400.png"),
    ("E04", "E04_Distribution_1080x2400.png"),
    ("E05", "E05_Loi_1080x2400.png"),
    ("E06", "E06_Dmolition_1080x2400.png"),
    ("E07", "E07_Boutique_1080x2400.png"),
    ("E08", "E08_Lasemaine_1080x2400.png"),
    ("E09", "E09_Inspections_1080x2400.png"),
    ("E10", "E10_Filire_1080x2400.png"),
    ("E11", "E11_DecisionDetail_1080x2400.png"),
]
REFS = [
    ("A01", "A01-cadre-4-la-suite.png"),
    ("A01t", "A01-cadre-5-tete-sur-ligne-haute.png"),
    ("E01", "E01-cadre-125.png"),
    ("E02", "E02-cadre-85.png"),
    ("E03", "E03-cadre-48.png"),
    ("E04", "E04-cadre-54.png"),
    ("E05", "E05-cadre-67.png"),
    ("E06", "E06-cadre-79.png"),
    ("E07", "E07-cadre-98.png"),
    ("E08", "E08-cadre-18-au-calme.png"),
    ("E09", "E09-cadre-31-tableau.png"),
    ("E10", "E10-cadre-140-pas-encore-de-filiere.png"),
    ("E11", "E11-cadre-04-la-carte-distribuee.png"),
]


def est_or(p):
    r, g, b = p
    return r > 110 and g > 80 and b < r - 40


def filets_or(im, y0, y1, seuil=400):
    """Lignes dont >seuil px (sur 1080, pas de 2) sont de l'or => filet pleine largeur."""
    px = im.load()
    out = []
    for y in range(y0, y1):
        n = 0
        for x in range(0, 1080, 2):
            if est_or(px[x, y]):
                n += 1
        if n * 2 > seuil:
            out.append((y, n * 2))
    return out


def anneau_manometre(im, y0, y1):
    """bbox des px d'or dans la colonne centrale : l'anneau du manomètre.
    On exclut les lignes de filet pleine largeur."""
    px = im.load()
    filet = {y for y, _ in filets_or(im, y0, y1)}
    mnx, mny, mxx, mxy = 10**9, 10**9, -1, -1
    for y in range(y0, y1):
        if y in filet:
            continue
        for x in range(380, 700):
            if est_or(px[x, y]):
                if x < mnx: mnx = x
                if x > mxx: mxx = x
                if y < mny: mny = y
                if y > mxy: mxy = y
    return (mnx, mny, mxx, mxy)


def epaisseur_anneau(im, ycentre):
    """Épaisseur de l'anneau d'or sur la ligne médiane du disque, bord gauche."""
    px = im.load()
    runs = []
    cur = 0
    for x in range(380, 700):
        if est_or(px[x, ycentre]):
            cur += 1
        else:
            if cur:
                runs.append(cur)
            cur = 0
    if cur:
        runs.append(cur)
    return runs


def mot(im, x0, y0, x1, y1, fond, seuil=35):
    return O.bbox_encre(im, x0, y0, x1, y1, fond, seuil)


def ligne(nom, im, zone_hud, fond):
    hy0, hy1 = zone_hud
    # ARGENT : moitié gauche du bandeau, bande de texte la plus haute
    prof = O.profil_lignes(im, 40, hy0, 320, hy1, fond, 35)
    bds = [b for b in O.bandes(prof, 2) if b[2] >= 8]
    argent = bds[0] if bds else None
    res = {"ecran": nom}
    if argent:
        y0, y1, h = argent
        bb = O.bbox_encre(im, 20, y0, 360, y1 + 1, fond, 35)
        res["ARGENT_h"] = h
        res["ARGENT_x"] = (bb[0], bb[2])
        res["ARGENT_w"] = bb[2] - bb[0] + 1
        res["ARGENT_ratio_w_h"] = round((bb[2] - bb[0] + 1) / h, 3)
    # JOUR : moitié droite (contrôle négatif : le libellé diffère)
    profd = O.profil_lignes(im, 700, hy0, 1050, hy1, fond, 35)
    bdd = [b for b in O.bandes(profd, 2) if b[2] >= 8]
    if bdd:
        y0, y1, h = bdd[0]
        bb = O.bbox_encre(im, 700, y0, 1060, y1 + 1, fond, 35)
        res["JOUR_h"] = h
        res["JOUR_w"] = bb[2] - bb[0] + 1
        res["JOUR_ratio_w_h"] = round((bb[2] - bb[0] + 1) / h, 3)
    return res


print("=== m01 CHROME DU HUD — captures 1080x2400 ===")
for nom, f in CAPS_2400:
    im = O.cap(f)
    r = ligne(nom, im, (8, 120), (12, 21, 28))
    fil = O.__dict__ and filets_or(im, 0, 260)
    an = anneau_manometre(im, 0, 260)
    ep = epaisseur_anneau(im, (an[1] + an[3]) // 2) if an[3] > 0 else []
    print("%-5s ARGENT h=%s w=%s w/h=%s | JOUR h=%s w/h=%s | anneau x%s..%s y%s..%s D=%s ep=%s | filets_or=%s"
          % (nom, r.get("ARGENT_h"), r.get("ARGENT_w"), r.get("ARGENT_ratio_w_h"),
             r.get("JOUR_h"), r.get("JOUR_ratio_w_h"),
             an[0], an[2], an[1], an[3], an[2] - an[0] + 1, ep,
             [(y, n) for y, n in fil]))

print()
print("=== m01 CHROME DU HUD — cadres de référence 1080x2102 ===")
for nom, f in REFS:
    im = O.ref(f)
    r = ligne(nom, im, (20, 150), (10, 14, 22))
    fil = filets_or(im, 0, 320)
    an = anneau_manometre(im, 0, 320)
    ep = epaisseur_anneau(im, (an[1] + an[3]) // 2) if an[3] > 0 else []
    print("%-5s ARGENT h=%s w=%s w/h=%s | JOUR h=%s w/h=%s | anneau x%s..%s y%s..%s D=%s ep=%s | filets_or=%s"
          % (nom, r.get("ARGENT_h"), r.get("ARGENT_w"), r.get("ARGENT_ratio_w_h"),
             r.get("JOUR_h"), r.get("JOUR_ratio_w_h"),
             an[0], an[2], an[1], an[3], an[2] - an[0] + 1, ep,
             [(y, n) for y, n in fil]))
