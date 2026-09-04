#!/usr/bin/env python3
"""Une suite de CAPTURE ne doit photographier QUE le compte de démo.

⛔ LE DÉFAUT QU'IL FERME. Mesuré par la session B le 2026-09-04 : 12 suites de capture sur 17
   signaient leur PROPRE compte (`auth.SignUp`) puis écrasaient l'identité du shell
   (`shell.SetIdentity(...)`). Elles photographiaient donc un monde VIDE — et les juges comparent
   ces planches aux maquettes. Rien ne rougissait : un écran sans données garde son cadre, son
   chrome et ses titres ; il ressemble trait pour trait à un écran qui marche.

⇒ LA PROPRIÉTÉ ASSERTÉE, et c'est une propriété de STRUCTURE, pas de pixel : aucun fichier de
  capture n'appelle `SetIdentity` ni `SignUp` sur une ligne ACTIVE. Le défaut du shell
  (`AppShell.cs`, champ `demoIdentifier`) est alors la seule identité possible.

⚠️ LES COMMENTAIRES SONT RETIRÉS AVANT DE COMPTER, et ce n'est pas un détail de propreté : les
   notes qui EXPLIQUENT le retrait citent forcément le nom retiré. Un contrôle qui lit le fichier
   entier se déclencherait sur sa propre documentation — le sujet et son contrôle partageraient un
   support éditable, exactement la classe que ce dépôt a payée deux fois le 2026-08-31.

⚠️ L'EXCEPTION EST NOMMÉE, PAS DEVINÉE. `BundleReelZeroRepliPlayModeTests` garde son `SignUp` :
   elle ne monte AUCUN shell — elle instancie l'écran seul pour mesurer les REPLIS de `Libelle`,
   une propriété indépendante du compte. Il n'y a pas d'identité de shell à préserver, donc rien
   à écraser. *La même ligne est un défaut dans une suite de capture et une nécessité dans une
   suite de mesure ; ce qui les sépare, c'est l'existence d'un shell dont on écrase le choix.*
   ⇒ Le critère appliqué ici n'est donc pas « le nom du fichier », c'est « ce fichier monte-t-il
     un `AppShell` ? ». Une exception dérivée d'une propriété se périme toute seule ; une
     exception par liste de noms survit à sa raison.
"""
import re, sys, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent / 'Assets' / 'Tests' / 'PlayMode'
INTERDITS = ('SetIdentity', 'SignUp')

def lignes_actives(txt):
    """Retire les commentaires de ligne et les blocs `/* */`. Ne prétend pas être un lexer C# :
    il ne gère pas un `//` dans une chaîne littérale — cas absent de ces fichiers, et un faux
    POSITIF (une ligne gardée à tort) est le sens sûr de l'erreur pour un contrôle interdisant."""
    txt = re.sub(r'/\*.*?\*/', '', txt, flags=re.S)
    return [l for l in txt.split('\n') if not l.strip().startswith('//')]

def main():
    fautifs, examines = [], []
    for f in sorted(RACINE.glob('*.cs')):
        txt = f.read_text(encoding='utf-8')
        actives = lignes_actives(txt)
        corps = '\n'.join(actives)
        # ⛔ LA POPULATION EST « CE FICHIER ÉCRIT-IL UNE IMAGE ? », PAS SON NOM. Le premier jet
        #    filtrait sur `Capture`/`Planche` dans le NOM et sur le montage d'un `AppShell` : il
        #    exemptait `DelegationScreenPlayModeTests`, qui écrit bien un PNG et signe bien un
        #    compte frais — le défaut exact, hors de portée parce que la suite photographie
        #    l'écran SEUL, sans shell à écraser. *Un critère de nom range ; il ne mesure pas.*
        if 'EncodeToPNG' not in corps:
            continue
        examines.append(f.name)
        hits = [(i + 1, l.strip()) for i, l in enumerate(actives)
                if any(m in l for m in INTERDITS)]
        if hits:
            fautifs.append((f.name, hits))

    print(f"suites qui ÉCRIVENT une image : {len(examines)}")
    if fautifs:
        print(f"\n⛔ {len(fautifs)} suite(s) photographient un compte FRAIS, donc un écran vide :")
        for n, hits in fautifs:
            for ligne, txt_ in hits:
                print(f"   {n}:{ligne}  {txt_}")
        print(f"\n   ({len(examines) - len(fautifs)} suite(s) photographient bien le compte de démo)")
        return 1
    print("\n✅ les " + str(len(examines)) + " suites qui écrivent une image photographient "
          "toutes le compte de démo.")
    return 0

if __name__ == '__main__':
    sys.exit(main())
