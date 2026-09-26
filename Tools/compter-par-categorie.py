#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Combien de tests PlayMode une liste de catégories MafiaCI va DÉCLARER, et combien elle va EXÉCUTER — lu dans les sources.

⛔ DEUX RÈGLES DIFFÉRENTES, ET C'EST LEUR ÉCART QUI MENT.
· DÉCLARÉS (`MafiaCI.CompterFeuillesFiltrees`) : une feuille compte si l'une de ses catégories — méthode ET classe, mesuré :
  les runs du 22/09 rendent declares == comptes (71, 439) — est ÉGALE à une entrée du filtre.
· EXÉCUTÉS (le `Filter.categoryNames` d'Unity) : chaque catégorie demandée est une REGEX NON ANCRÉE — lu dans la source,
  `com.unity.test-framework/UnityEngine.TestRunner/TestRunner/RuntimeTestRunnerFilter.cs:31` (`CategoryFilterExtended(s)
  { IsRegex = true }`, `Regex.IsMatch` de NUnit) ⇒ elle prend toute catégorie qui la CONTIENT, pas seulement celles qui commencent
  par elle (`HUD` prend `HUDv31`, et `EcranDelegation` prend `PhotoEcranDelegation` — mesuré le 2026-09-24, comptes 86 ≠ declares 85).
  ⚠️ Ancienne règle de cet outil (préfixe, jusqu'au 24/09) : elle SOUS-COMPTAIT tout infixe ;
  et une catégorie posée sur la CLASSE sélectionne toutes ses méthodes, même celles qui portent la leur.
Un filtre dont les deux comptes diffèrent (une catégorie PRISE PAR LA REGEX) donnera `comptes > declares` au run — MafiaCI
ne rougit que sur `comptes < declares` : ce script le dit AVANT.
CALIBRÉ le 2026-09-22 sur trois runs mesurés : Inspection,W3UDA,EcranExceptions @6e83071b → 71 (mesuré 71) ; W3U1 → 38 (38) ;
Inspection @ac003698 → 5 (5) ; filtre complet @55702bf8 → 438 feuilles lancées (journal), voir le commit.
Les `[TestCase(...)]` comptent une feuille chacun ; les `[Ignore]` sont déclarés et comptés (skipped) — listés à part.

Usage : python3 Tools/compter-par-categorie.py Cat1,Cat2,… [--rev <commit>] [--detail]
"""
import re, subprocess, sys, collections

def prend(demandee, categorie):
    """la règle RÉELLE du filtre d'Unity : la catégorie demandée est une regex NON ANCRÉE (RuntimeTestRunnerFilter.cs:31, IsRegex)"""
    return re.search(demandee, categorie) is not None

def fichiers(rev):
    if rev:
        noms = subprocess.run(['git', 'ls-tree', '-r', '--name-only', rev, 'Assets/Tests/PlayMode'], capture_output=True, text=True).stdout.split()
        for n in noms:
            if n.endswith('.cs'):
                yield n, subprocess.run(['git', 'show', f'{rev}:{n}'], capture_output=True, text=True).stdout
    else:
        import pathlib
        for p in sorted(pathlib.Path('Assets/Tests/PlayMode').rglob('*.cs')):
            yield str(p), p.read_text(encoding='utf-8', errors='replace')

ATTR = re.compile(r'^\s*\[(.*)\]\s*$')
CAT = re.compile(r'Category\("([^"]+)"\)')

def profondeur(ligne):
    """variation du nombre de crochets ouverts sur la ligne, hors chaînes "…" et caractères '…'"""
    d, i, n = 0, 0, len(ligne)
    while i < n:
        c = ligne[i]
        if c == '"':
            i += 1
            while i < n and ligne[i] != '"':
                i += 2 if ligne[i] == '\\' else 1
        elif c == "'":
            i += 1
            while i < n and ligne[i] != "'":
                i += 2 if ligne[i] == '\\' else 1
        elif c == '/' and ligne[i + 1:i + 2] == '/':
            break
        elif c == '[': d += 1
        elif c == ']': d -= 1
        i += 1
    return d

def recolle(texte):
    """un attribut écrit sur plusieurs lignes (`[TestCase("…", 1,` ↵ `"…")]`) devient une seule ligne : 26 feuilles manquées au calibrage"""
    out, tampon, d = [], None, 0
    for l in texte.split('\n'):
        if tampon is not None:
            tampon += ' ' + l.strip(); d += profondeur(l)
            if d <= 0: out.append(tampon); tampon = None
            continue
        if l.strip().startswith('[') and profondeur(l) > 0:
            tampon, d = l, profondeur(l)
            continue
        out.append(l)
    if tampon is not None: out.append(tampon)
    return out

def code_seul(ligne):
    """la ligne sans le CONTENU des chaînes ni les commentaires : `"class AppShell { … }"` n'est pas une déclaration"""
    o, i, n = [], 0, len(ligne)
    while i < n:
        c = ligne[i]
        if c in '"\'':
            q = c; o.append(q); i += 1
            while i < n and ligne[i] != q:
                i += 2 if ligne[i] == '\\' else 1
            o.append(q); i += 1
        elif c == '/' and ligne[i + 1:i + 2] == '/':
            break
        else:
            o.append(c); i += 1
    return ''.join(o)

def feuilles(texte):
    """[(classe, méthode, cats_classe, cats_méthode, nb_feuilles, ignoree)] — classes suivies par la profondeur d'accolades
    (une classe imbriquée, un DTO privé, ne remplace plus la classe englobante : 3 feuilles manquées au calibrage)"""
    out, attrs, pile, prof = [], [], [], 0
    for l in recolle(texte):
        l = re.sub(r'(\])\s*//.*$', r'\1', l)
        s = l.strip()
        code = code_seul(l)
        if s.startswith('//') or s.startswith('*') or s.startswith('/*'):
            continue
        m = ATTR.match(l)
        if m and not re.search(r'\b(class|void|IEnumerator)\b', code):
            attrs.append(m.group(1))
        else:
            mc = re.search(r'\bclass\s+(\w+)', code)
            mm = re.search(r'\b(?:IEnumerator|void)\s+(\w+)\s*\(', code)
            if mc:
                # `'{' in code` : une classe d'UNE ligne (`class X : Graphic { }`) ouvre et ferme ses accolades sur sa ligne — la
                # profondeur ne bouge pas, elle n'était jamais « entrée » et restait sur la pile : les tests suivants lui étaient
                # attribués SANS catégorie (AccueilCanon A10 et A4 manqués, 26/09 : 8 comptés pour 10 exécutés, MafiaCI 584 vs 582)
                pile.append([mc.group(1), [c for a in attrs for c in CAT.findall(a)], prof, '{' in code]); attrs = []
            elif mm:
                blob = ' '.join(attrs)
                if re.search(r'\b(Test|UnityTest|TestCase|TestCaseSource)\b', blob) and pile:
                    n = len(re.findall(r'\bTestCase\s*\(', blob)) or 1
                    out.append((pile[-1][0], mm.group(1), list(pile[-1][1]), CAT.findall(blob), n, 'Ignore' in blob))
                attrs = []
            elif s and not s.startswith('['):
                attrs = []
        prof += code.count('{') - code.count('}')
        while pile:
            if prof > pile[-1][2]: pile[-1][3] = True
            if pile[-1][3] and prof <= pile[-1][2]: pile.pop()
            else: break
    return out

def main():
    filtre = [c.strip() for c in sys.argv[1].split(',') if c.strip()]
    rev = sys.argv[sys.argv.index('--rev') + 1] if '--rev' in sys.argv else None
    detail = '--detail' in sys.argv
    decl, exe, ign = collections.Counter(), collections.Counter(), []
    vues = collections.Counter(); portees = set(); diff = []
    tot_d = tot_e = 0
    for f, t in fichiers(rev):
        for classe, meth, cc, cm, n, ignoree in feuilles(t):
            toutes = set(cc) | set(cm)
            # DÉCLARÉS : égalité EXACTE, catégories de la méthode ET de sa classe (mesuré : les runs du 22/09 rendent
            # declares == comptes, 71 et 439 — l'adaptateur Unity porte les catégories héritées).
            propres = toutes
            d = any(c in filtre for c in propres)
            e = any(prend(x, c) for c in toutes for x in filtre)
            if d:
                tot_d += n
                for x in filtre:
                    if x in propres: decl[x] += n
            if e:
                tot_e += n
                portees |= toutes
                for c in toutes:
                    if any(prend(x, c) for x in filtre): vues[c] += n
                for x in filtre:
                    if any(prend(x, c) for c in toutes): exe[x] += n
                if ignoree: ign.append(f"{f.split('/')[-1]}:{meth}")
            if d != e: diff.append((f.split('/')[-1], classe, meth, cc, cm, 'déclaré seulement' if d else 'exécuté seulement'))
    print(f"filtre = {filtre}" + (f" · rev {rev}" if rev else ""))
    print(f"DÉCLARÉS (règle MafiaCI) : {tot_d}   ·   EXÉCUTÉS attendus (règle Unity) : {tot_e}   ·   dont [Ignore] : {len(ign)}")
    for x in filtre: print(f"  {x:22s} déclarés {decl[x]:4d} · exécutés {exe[x]:4d}")
    print("catégories RÉELLEMENT prises (attendu) :", ', '.join(sorted(vues)))
    # ⛔ CE QUE MAFIACI IMPRIME n'est PAS la ligne ci-dessus : « catégories RÉELLEMENT exécutées » est l'UNION de toutes les
    #    catégories PORTÉES par les tests exécutés, y compris celles qu'aucune entrée du filtre ne demande. Mesuré le 22/09
    #    (créneau 558289a0) : 15 listées pour 14 prises — `EcranDemolitionC1`, pris par sa classe `EcranDemolition`, porte aussi
    #    `PhotoEcranDemolition`. Le runbook avait annoncé 14 en confondant les deux.
    print(f"catégories PORTÉES par les tests pris — la ligne « RÉELLEMENT exécutées » de MafiaCI ({len(portees)}) :",
          ', '.join(sorted(portees)))
    if ign: print("[Ignore] :", ', '.join(ign))
    if diff:
        print(f"⛔ {len(diff)} feuille(s) où les deux règles divergent :")
        for r in diff[:20] if not detail else diff: print("   ", r)
    return 0

if __name__ == '__main__':
    sys.exit(main())
