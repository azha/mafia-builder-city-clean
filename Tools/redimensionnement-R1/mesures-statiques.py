#!/usr/bin/env python3
"""R1 — les livrables STATIQUES du lot « redimensionnement » : ㉘, ㉖, ㉚.

Ces trois livrables sont des conséquences arithmétiques de deux constantes du client
(la taille du fond pré-rendu, la largeur de référence du `CanvasScaler`) et de la liste des
résolutions que le harnais rend. Ils ne demandent NI éditeur NI run : les publier ici les rend
opposables, et les recalculer les rend re-dérivables — un nombre dont l'instrument n'est pas dans
le dépôt est un témoignage.

⚠️ CE QUE CE SCRIPT NE PROUVE PAS : que le client SE COMPORTE ainsi. Il calcule ce que les
   formules IMPLIQUENT. La confrontation au comportement réel est ⑮/㉙ (deux points rendus), qui
   exigent l'éditeur. **Ne pas lire ces tables comme une mesure en jeu.**

⚠️ LES CONSTANTES SONT ANCRÉES, PAS RECOPIÉES DE MÉMOIRE — voir ANCRES ci-dessous. Si une ancre
   ne correspond plus, le script SORT EN ERREUR plutôt que de calculer sur une valeur périmée.
"""
import pathlib, re, sys, struct

RACINE = pathlib.Path(__file__).resolve().parents[2]

# ⛔ LES CONSTANTES SONT MESURÉES SUR LES ASSETS, JAMAIS ÉCRITES DE MÉMOIRE. La v1 de ce script
#    les portait en dur avec une ancre qui ne mordait pas (« motif introuvable ») : elle calculait
#    trois tables sur des valeurs SUPPOSÉES tout en affichant qu elle n avait rien confirmé.
#    Le fond n est d ailleurs pas une constante du code — `fondRt.sizeDelta = new Vector2(
#    tex.width, tex.height) / scaleFactor` : la grandeur vit dans la TEXTURE, et c est elle qu on lit.
FONDS = sorted((RACINE / 'Assets/Art/District/Backgrounds').glob('VERGE_D_*_FINAL.png'))
SCALER = RACINE / 'Assets/Scripts/CityMap/DistrictInteriorScreenController.cs'

def dims_png(p):
    b = p.read_bytes()[:24]
    if b[:8] != b'\x89PNG\r\n\x1a\n': return None
    return struct.unpack('>II', b[16:24])

if not FONDS:
    print('⛔ aucun fond de district trouvé — le script NE PEUT PAS mesurer'); sys.exit(2)
tailles = {dims_png(p) for p in FONDS}
if len(tailles) != 1 or None in tailles:
    print(f'⛔ les fonds ne partagent pas UNE taille : {tailles} — la borne n a pas de référence unique')
    sys.exit(2)
FOND_W, FOND_H = (float(v) for v in tailles.pop())

m = re.search(r'referenceResolution\s*=\s*new Vector2\((\d+)\s*,\s*(\d+)\)', SCALER.read_text(encoding='utf-8', errors='replace'))
if not m:
    print(f'⛔ referenceResolution introuvable dans {SCALER.name} — largeur de référence NON confirmée')
    sys.exit(2)
REF_W = float(m.group(1))

etat_ancres = [f'fond {len(FONDS)} fichier(s) @Assets/Art/District/Backgrounds → {FOND_W:.0f}×{FOND_H:.0f}',
               f'referenceResolution @{SCALER.name} → {REF_W:.0f}']

RES = [(1920, 1080, 'S1 départ · paysage large'),
       (1280, 720,  'S1 arrivée · paysage étroit'),
       (1080, 1920, 'portrait de référence'),
       (1080, 2400, 'portrait long'),
       (1440, 3200, 'S2 départ · portrait dense')]

def contain(w, h): return min(w / FOND_W, h / FOND_H)

def paliers(w, h):
    L = [1.0, 2.0, 3.0]; c = contain(w, h)
    if all(abs(c - v) >= 1e-4 for v in L): L.append(c)
    return sorted(L)

def atteignable(w, h, s):
    """Fraction de la dimension de CONTENU à l'échelle du palier, par axe."""
    sf = w / REF_W
    fx, fy = FOND_W / sf * s, FOND_H / sf * s
    vx, vy = w / sf, h / sf
    return (max(0.0, (fx - vx) / 2) / fx if fx > vx else 0.0,
            max(0.0, (fy - vy) / 2) / fy if fy > vy else 0.0)

print('ANCRES  ' + ' · '.join(etat_ancres))
print(f'CONSTANTES  fond {FOND_W:.0f}×{FOND_H:.0f} px · largeur de référence {REF_W:.0f}\n')

print('㉘ — BORNE D ATTEIGNABILITÉ, PAR AXE, AUX DEUX PALIERS')
print('   unité : fraction de la dimension de contenu à l échelle du palier · portée : les 5 résolutions rendues')
print(f'   {"viewport":13} {"contain":>8} {"X ×1":>8} {"Y ×1":>8} {"X ×2":>8} {"Y ×2":>8}   rôle')
for w, h, role in RES:
    x1, y1 = atteignable(w, h, 1); x2, y2 = atteignable(w, h, 2)
    print(f'   {f"{w}×{h}":13} {contain(w,h):>8.4f} {x1:>8.4f} {y1:>8.4f} {x2:>8.4f} {y2:>8.4f}   {role}')

print('\n㉖ — DÉTECTEUR DE c3 : le dernier palier vaut-il 3 ?')
print('   L épingle porte sur une VALEUR PRÉSENTE, jamais sur une absence : elle est VERTE aujourd hui')
print('   et ROUGIT le jour où une résolution rend contain ≥ 3.')
tous = True
for w, h, _ in RES:
    L = paliers(w, h); ok = abs(L[-1] - 3.0) < 1e-6; tous &= ok
    print(f'   {f"{w}×{h}":13} paliers={[round(v,4) for v in L]}  dernier={L[-1]:.4f}  {"✅" if ok else "⛔"}')
print(f'   ⇒ {"toutes vertes" if tous else "AU MOINS UNE ROUGE"} · c3 exigerait W ≥ {3*FOND_W:.0f} ET H ≥ {3*FOND_H:.0f}')

print('\n㉚ — CONVERSION D UNITÉS DU CADRAGE : chaque membre / (son PROPRE fond local × palier)')
print('   Le diviseur change AUX DEUX BOUTS d un même scénario — c est ce qui rend la comparaison licite.')
for lab, (w, h), s in [('S1 départ', (1920, 1080), 1), ('S1 arrivée', (1280, 720), 1),
                       ('S2 départ', (1440, 3200), 2), ('S2 arrivée', (1080, 1920), 2)]:
    sf = w / REF_W; fx, fy = FOND_W / sf, FOND_H / sf
    print(f'   {lab:11} facteur={sf:.5f}  fond local=({fx:8.1f},{fy:8.1f})  diviseur ×{s}=({fx*s:8.1f},{fy*s:8.1f})')

print('\n⚠️ NON PROUVÉ ICI : le comportement réel du client. Ces tables sont ce que les formules')
print('   IMPLIQUENT — ⑮ et ㉙ (deux points RENDUS) exigent l éditeur et restent dus.')
