#!/usr/bin/env python3
"""Replis ATTENDUS de ② et du chrome, par ensembles de clés — PAS le compteur d'exécution `Libelle.NbReplis`.
Pour chaque site `Libelle` à arguments LITTÉRAUX de ces fichiers, la clé qu'il demande ; puis, contre un bundle, combien
n'y sont pas (= ce que `NbReplis` compterait si CHAQUE site était rendu une fois). Les sites à argument non littéral sont
comptés à part : ils ne se résolvent pas sans exécution."""
import json, re, sys, pathlib, unicodedata
sys.path.insert(0, 'Tools/juge-donnees/i18n')
from orphelines import slug, sans_commentaires, dechappe
LITT = r'"((?:[^"\\\n]|\\.)*)"'
ECRANS = {
  '② la fiche du bâtiment': [('Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs', [
        (re.compile(r'\bBande\(\s*' + LITT + r'\s*,\s*' + LITT + r'\s*,'), 'building', None),      # Bande(famille, valeur, repli)
        (re.compile(r'\bCle\(\s*' + LITT + r'\s*,\s*' + LITT + r'\s*\)'), 'building', None)])],    # Cle(role, littéral)
  'chrome partagé': [
     ('Assets/Scripts/Shell/HomeChromeController.cs', [
        (re.compile(r'\bLib\(\s*' + LITT + r'\s*,\s*' + LITT + r'\s*\)'), 'accueil', None),
        (re.compile(r'Libelle\.ParValeur\(\s*' + LITT + r'\s*,\s*' + LITT + r'\s*,\s*' + LITT), None, 'pv')]),
     ('Assets/Scripts/Shell/OrgVitalsPanelController.cs', [
        (re.compile(r'\bLib\(\s*' + LITT + r'\s*,\s*' + LITT + r'\s*\)'), 'accueil', None)])],
}
APPELS = {'BuildingCardController.cs': r'\b(?:Bande|Cle)\(', 'HomeChromeController.cs': r'\bLib\(|Libelle\.ParValeur\(',
          'OrgVitalsPanelController.cs': r'\bLib\('}
def messages(chemin):
    return set(json.load(open(chemin, encoding='utf-8'))['payload']['data']['messages'])
avant, apres = messages(sys.argv[1]), messages(sys.argv[2])
print(f"bundle AVANT {sys.argv[1]} : {len(avant)} clés · APRÈS {sys.argv[2]} : {len(apres)} clés\n")
for ecran, fichiers in ECRANS.items():
    cles, non_litteraux = set(), 0
    for f, motifs in fichiers:
        t = sans_commentaires(pathlib.Path(f).read_text(encoding='utf-8'))
        nom = f.rsplit('/', 1)[1]
        tous = len(re.findall(APPELS[nom], t)) - 1                        # moins la définition de l'enveloppeur
        lus = 0
        for rx, dom, mode in motifs:
            for m in rx.finditer(t):
                lus += 1
                if mode == 'pv': cles.add(f'{m.group(1)}.{m.group(2)}.{slug(dechappe(m.group(3)))}')
                else: cles.add(f'{dom}.{m.group(1)}.{slug(dechappe(m.group(2)))}')
        non_litteraux += max(0, tous - lus)
    ma, mp = sorted(cles - avant), sorted(cles - apres)
    print(f"{ecran} : {len(cles)} clés demandées (sites littéraux) · sites non littéraux : {non_litteraux}")
    print(f"   manquantes AVANT : {len(ma)}   ·   manquantes APRÈS : {len(mp)}")
    for k in mp: print(f"     reste manquante : {k}")
    print()
