#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle du 52 (table de noms de la fiction, échantillon) : lit les tableaux §3.1-3.4 du document et vérifie
- 10 lignes par catégorie (commande f2 du 23/09 : « un échantillon de 10 par catégorie ») ;
- statut « proposé » ou « canon » sur chaque ligne ; les canons ne sont que Salvatore et Nestor (maquette, clé servie) ;
- aucun doublon de nom propre dans une catégorie ni entre lieutenants et dealers (règle déjà codée au back) ;
- aucun nom propre proposé ne reprend un réservoir SERVI (lu à `git show HEAD` du back, par fichier) — un mélange doit rester lisible ;
- aucun nom de la liste d'exclusion (clans et figures connus, fictions célèbres) — LISTE DE L'ATELIER, pas un registre ;
- les enseignes marquées « servie » au §3.4 existent bien dans building-signs.ts.
Exit 1 s'il y a au moins un défaut (tous sont listés). Usage : python3 Tools/atelier-2026-09-22/controle-52-noms.py"""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
DOC = os.path.join(ICI, '52-table-de-noms-2026-09-23.md')
BACK = os.path.expanduser('~/project/mafia-back-suite')
def servi(chemin):
    return subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/' + chemin], capture_output=True, text=True, check=True).stdout
# seulement le CONTENU des tableaux « [...] » : les apostrophes des commentaires (« l'ordre ») décalent un appariement global
POOLS = {c: {x for arr in re.findall(r"\[([^\]]*)\]", servi(c)) for x in re.findall(r"'([^'\n]+)'", arr)} for c in (
    'operational/lieutenant/lieutenant-name-pool.ts', 'common/dealer-names.ts', 'operational/legal/lawyer-name-pool.ts', 'common/building-signs.ts')}
ENSEIGNES = POOLS['common/building-signs.ts']
MOTS_SERVIS = {m for c, v in POOLS.items() for x in v for m in re.findall(r'[A-ZÀ-Ý][\wÀ-ÿ-]+', x)}
EXCLUS = {  # clans et figures connus (Campanie), fictions célèbres — à revérifier avant la liste complète
    'Cutolo', 'Alfieri', 'Nuvoletta', 'Bardellino', 'Zaza', 'Giuliano', 'Licciardi', 'Contini', 'Mallardo', 'Lauro', 'Russo',
    'Sarno', 'Mazzarella', 'Moccia', 'Fabbrocino', 'Misso', 'Polverino', 'Iovine', 'Schiavone', 'Zagaria', 'Gionta',
    'Alessandro', 'Cesarano', 'Vollaro', 'Aprea', 'Cuccaro', 'Rinaldi', 'Reale', 'Amato', 'Pagano', 'Birra', 'Ascione',
    'Papale', 'Belforte', 'Nuzzo', 'Maresca', 'Cozzolino', 'Esposito', 'Savastano', 'Conte', 'Marzio', 'Troncone',
    'Soprano', 'Corleone', 'Moltisanti', 'Montana', 'Pupetta', 'Totò', 'Coppola', 'Gomorra'}
s = open(DOC, encoding='utf-8').read()
defauts = []
sections = {}
for m in re.finditer(r'^### 3\.(\d) (.+)$', s, re.M):
    fin = s.find('\n### ', m.end()); fin = len(s) if fin < 0 else fin
    lignes = [l for l in s[m.end():fin].split('\n') if re.match(r'^\| \d+ \|', l)]
    sections[m.group(1)] = [[c.strip() for c in l.strip('|').split('|')] for l in lignes]
if sorted(sections) != ['1', '2', '3', '4']: defauts.append(f'sections §3.x trouvées {sorted(sections)} — attendues 1-4')
noms = {}
for k, rows in sections.items():
    if len(rows) != 10: defauts.append(f'§3.{k} : {len(rows)} lignes, attendu 10')
    for r in rows:
        statut = next((c for c in r if c.startswith(('proposé', 'canon'))), None)
        if not statut: defauts.append(f'§3.{k} ligne {r[0]} : ni « proposé » ni « canon »')
    col = {'1': 1, '2': 1, '3': 2, '4': 3}[k]
    noms[k] = [r[col] for r in rows]
lts, dls = noms.get('1', []), noms.get('2', [])
canons = [r[1] for r in sections.get('1', []) if r[2].startswith('canon')]
if sorted(canons) != ['Nestor', 'Salvatore']: defauts.append(f'canons lieutenants {canons} — attendus Salvatore, Nestor')
for k, v in noms.items():
    doublons = {x for x in v if v.count(x) > 1}
    if doublons: defauts.append(f'§3.{k} : doublons {sorted(doublons)}')
if set(lts) & set(dls): defauts.append(f'lieutenants ∩ dealers : {sorted(set(lts) & set(dls))}')
# noms propres proposés : lieutenants, dealers, et le patronyme des enseignes proposées (§3.3 ; §3.4 hors « servie »)
propres = [(k, n) for k in '12' for n, r in zip(noms.get(k, []), sections.get(k, [])) if 'proposé' in ' '.join(r)]
for r in sections.get('3', []): propres.append(('3', r[2].split()[-1]))
for r in sections.get('4', []):
    ens = r[3].split(' — ')[0]
    if '(enseigne servie)' in r[4]:
        if ens not in ENSEIGNES: defauts.append(f'§3.4 ligne {r[0]} : « {ens} » marquée servie, absente de building-signs.ts')
    else: propres.append(('4', ens.split()[-1]))
for k, n in propres:
    if n in MOTS_SERVIS: defauts.append(f'§3.{k} : « {n} » reprend un réservoir servi')
    if n in EXCLUS: defauts.append(f'§3.{k} : « {n} » est dans la liste d\'exclusion')
print(f'52 : lieutenants {len(lts)} (canon {len(canons)}) · dealers {len(dls)} · enseignes {len(noms.get("3", []))} · nœuds {len(noms.get("4", []))} · '
      f'noms propres proposés contrôlés {len(propres)} · réservoirs servis lus {sum(len(v) for v in POOLS.values())} chaînes · exclusions {len(EXCLUS)}')
for d in defauts: print('⛔', d)
sys.exit(1 if defauts else 0)
