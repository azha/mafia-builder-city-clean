# Inventaire M — cadre #32 (série 6) de ecrans-brennar-6.html, extrait par ancre de commentaire.
import re, json
H = open('/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html', encoding='utf-8').read()
deb = H.index('<!-- 32 :')
fin = H.index('<!-- 33 :')
bloc = H[deb:fin]
print("longueur du cadre 32 :", len(bloc))
# le commentaire d'intention
print("\n--- commentaire d'intention ---")
print(bloc[:bloc.index('-->')+3])
# les 18 lignes
lignes = re.findall(r'<div class="lg">(.*?)</div>\s*(?=<div class="lg">|</div>)', bloc, re.S)
lg = re.findall(r'<div class="lg">(.*?)(?=<div class="lg">|<div class="pied-l">)', bloc, re.S)
print("\n--- cardinal des lignes de district ---", len(lg))
champs = []
for i, l in enumerate(lg, 1):
    d = dict(re.findall(r'<span class="(\w+)">([^<]*)</span>', l))
    champs.append(d)
    print(f"{i:2d}", json.dumps(d, ensure_ascii=False))
# colonnes d'en-tête
print("\n--- colonnes ---")
cols = re.search(r'<div class="cols">(.*?)</div>', bloc, re.S)
print(re.findall(r'<span class="(\w+)">([^<]*)</span>', cols.group(1)))
# la barre + tête + pied
print("\n--- tete-l ---", re.findall(r'<div class="tete-l">(.*?)</div>', bloc, re.S))
print("--- pied-l ---", re.findall(r'<div class="pied-l">([^<]*)</div>', bloc))
print("--- barre (aile/mano) ---", re.findall(r'<span class="(lib|val)">([^<]*)</span>', bloc)[:8])
# valeurs distinctes par colonne
print("\n--- domaines observés par colonne ---")
for k in ('dd','nn','pch','rg','sr'):
    vals = sorted({c.get(k,'') for c in champs})
    print(f"  {k}: {len(vals)} valeurs distinctes -> {vals if k!='dd' else vals[:20]}")
