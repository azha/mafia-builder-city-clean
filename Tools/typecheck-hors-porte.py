#!/usr/bin/env python3
"""Typecheck C# SANS prendre la porte Unity — Roslyn seul, sur les .csproj générés.

    python3 Tools/typecheck-hors-porte.py CityMap.csproj Assets/Scripts/CityMap/BuildingIcons.cs
    python3 Tools/typecheck-hors-porte.py --tout          # les 17 assemblies

⛔⛔ POURQUOI CET OUTIL EXISTE. Les erreurs de compilation de ce dépôt ne sont pas
attrapées en revue, elles sont attrapées AU PREMIER RUN — c'est-à-dire après avoir
pris une porte que trois sessions se partagent, lancé un batchmode, et attendu.
Mesuré : `IReadOnlyCollection<string>` n'a pas de `Contains`, une classe `WorldClient`
inventée, une signature de callback fausse — trois cycles de porte pour trois fautes
que le compilateur voit en 20 secondes. La porte est la ressource rare de ce dépôt ;
la brûler pour un typecheck est une perte sèche.

⚠️ LES DEUX PIÈGES DE CET OUTIL, ET IL FAUT LES CONNAÎTRE POUR LE CROIRE.

1. LES .csproj SONT DATÉS. Unity les régénère à l'import ; un fichier NEUF n'y est pas.
   D'où les arguments positionnels : les sources supplémentaires s'ajoutent à la liste.
   Un fichier neuf oublié = un vert qui ne prouve rien sur lui — la forme exacte du
   « run qui n'a jamais démarré ». ⇒ Le compte de sources est IMPRIMÉ : le lire.

2. LES DLL DES ASSEMBLIES SŒURS SONT DATÉES AUSSI. Les `ProjectReference` sont résolues
   vers `Library/ScriptAssemblies/<nom>.dll`, c'est-à-dire la DERNIÈRE compilation
   réussie. Un symbole ajouté aujourd'hui dans `CityMap` est ABSENT de `CityMap.dll`,
   donc un test qui l'utilise rougit `CS0103` — une erreur de l'INSTRUMENT, pas du code.
   ⇒ `--frais <Assembly>` recompile d'abord l'assembly nommée et fait pointer les
   dépendantes dessus. Sans ça, on classe un vrai vert en rouge, et l'inverse arrive
   aussi : un symbole SUPPRIMÉ reste dans la DLL et le typecheck reste vert.

⛔ ET LE CONTRÔLE POSITIF N'EST PAS OPTIONNEL. Un compilateur qui n'a pas vu vos
fichiers rend `EXIT=0` exactement comme un compilateur satisfait — ce dépôt a déjà
payé la même famille sur un `npx tsc` qui résolvait un AUTRE paquet en annonçant
« completed » avec `EXIT=0`. `--controle` injecte une faute dans le premier fichier
supplémentaire et EXIGE un rouge à la bonne ligne ; il restaure ensuite le fichier.
Un vert obtenu sans contrôle positif ne vaut rien.

⚠️ CE QUE CET OUTIL NE PROUVE PAS, et c'est la moitié de sa valeur : il typecheck.
Il ne dit RIEN de ce que le code FAIT. Une garde qui compile et qui vérifie la mauvaise
propriété passe ici en vert. La porte reste nécessaire — elle n'est simplement plus
brûlée pour des fautes de frappe.
"""
import os, re, shutil, subprocess, sys

U = '/home/erutheone/Unity/Hub/Editor/6000.4.6f1/Editor/Data'
DOTNET, CSC = f'{U}/NetCoreRuntime/dotnet', f'{U}/DotNetSdkRoslyn/csc.dll'
TMP = os.environ.get('TMPDIR', '/tmp') + '/typecheck-hors-porte'


def compile_un(proj, extra=(), out=None, subst=None, muet=False):
    x = open(proj, encoding='utf-8').read()
    srcs = [s.replace('\\', '/') for s in re.findall(r'<Compile Include="([^"]+)"', x)]
    refs = [r.replace('\\', '/') for r in re.findall(r'<HintPath>([^<]+)</HintPath>', x)]
    # ⚠️ LE TIRET EST OBLIGATOIRE DANS CETTE CLASSE. Sans lui, `Assembly-CSharp.csproj`
    #    capture « CSharp », la DLL cherchée n'existe pas, la référence est silencieusement
    #    ABANDONNÉE — et les types de cette assembly deviennent « introuvables ». Mesuré :
    #    2 CS0246 sur le template Unity, que j'ai failli classer « artefact pré-existant ».
    #    *Un motif trop étroit rend le résultat qui arrange, et une référence manquante
    #    ressemble trait pour trait à un vrai défaut de code.*
    for pr in re.findall(r'<ProjectReference Include="[^"]*?([A-Za-z0-9_.-]+)\.csproj"', x):
        d = (subst or {}).get(pr, f'Library/ScriptAssemblies/{pr}.dll')
        if os.path.exists(d):
            refs.append(d)
    defs = re.findall(r'<DefineConstants>([^<]*)</DefineConstants>', x)
    srcs = [s for s in srcs if os.path.exists(s)]
    # ⛔ RATTRAPAGE DE LA DATATION DU .csproj — le piège 1 de l'en-tête, mesuré sur ce dépôt
    #    même : `CityMap.csproj` listait 20 sources pour 21 fichiers, et l'unique manquant
    #    était celui du jour. Le typecheck rougissait « symbole introuvable » en accusant du
    #    code juste. On ramasse donc tout `.cs` vivant dans un dossier que le .csproj cite
    #    DÉJÀ : ça couvre le cas réel (un fichier neuf posé à côté de ses voisins) sans
    #    inventer d'appartenance d'assembly — un .cs d'un dossier jamais cité n'est PAS
    #    ramassé, et c'est voulu : deviner l'assembly d'un fichier serait un fait DÉDUIT.
    connus = set(srcs)
    for d in {os.path.dirname(s) for s in srcs}:
        for n in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            q = f'{d}/{n}'
            if n.endswith('.cs') and q not in connus:
                srcs.append(q)
    ramasses = len(srcs) - len(connus)
    srcs = list(dict.fromkeys(srcs + list(extra)))
    os.makedirs(TMP, exist_ok=True)
    out = out or f'{TMP}/{os.path.splitext(os.path.basename(proj))[0]}.dll'
    rsp = f'{TMP}/csc.rsp'
    with open(rsp, 'w') as f:
        f.write(f'-target:library -nostdlib+ -noconfig -langversion:9.0 '
                f'-nowarn:0169,0649,0414\n-out:{out}\n')
        if defs:
            f.write('-define:' + defs[0] + '\n')
        for r in refs:
            if os.path.exists(r):
                f.write(f'-r:"{r}"\n')
        for s in srcs:
            f.write(f'"{s}"\n')
    p = subprocess.run([DOTNET, CSC, f'@{rsp}'], capture_output=True, text=True)
    err = [l.strip() for l in (p.stdout + p.stderr).split('\n') if ': error ' in l]
    if not muet:
        nref = sum(1 for r in refs if os.path.exists(r))
        sup = f" (+{ramasses} hors .csproj)" if ramasses else ""
        print(f"{proj}: {len(srcs)} sources{sup} · {nref} refs · EXIT={p.returncode} · {len(err)} erreur(s)")
        for l in err[:40]:
            print("   ", l)
    return p.returncode, err, out


def main():
    a = sys.argv[1:]
    controle = '--controle' in a
    a = [x for x in a if x != '--controle']
    frais = []
    while '--frais' in a:
        i = a.index('--frais'); frais.append(a[i + 1]); del a[i:i + 2]

    if '--tout' in a:
        # ⛔ ORDRE TOPOLOGIQUE ET DLL FRAÎCHES — sinon le piège 2 rend un rouge à chaque
        #    assembly qui consomme un symbole ajouté aujourd'hui chez sa voisine, et ce
        #    rouge accuse du code juste. Mesuré ici : `CityMap.PlayMode.Tests` rougissait
        #    CS0103 sur un type que `CityMap` venait de gagner. Chaque assembly compilée
        #    est donc RÉINJECTÉE comme référence des suivantes.
        projs = sorted(f for f in os.listdir('.') if f.endswith('.csproj'))
        dep = {}
        for q in projs:
            xq = open(q, encoding='utf-8').read()
            dep[q] = {f'{n}.csproj' for n in
                      re.findall(r'<ProjectReference Include="[^"]*?([A-Za-z0-9_.-]+)\.csproj"', xq)
                      if f'{n}.csproj' in projs}
        ordre, restant = [], dict(dep)
        while restant:
            libres = [q for q, d in restant.items() if not (d - set(ordre))]
            if not libres:            # cycle : on rend l'ordre restant tel quel plutôt
                libres = list(restant)  # que de boucler — et on le DIT.
                print(f"⚠️ cycle de références détecté sur {len(libres)} projet(s) — "
                      "ordre arbitraire, un rouge peut y être un artefact")
            for q in sorted(libres):
                ordre.append(q); restant.pop(q)
        rc, subst = 0, {}
        for q in ordre:
            r, _, out = compile_un(q, subst=subst)
            rc |= r
            if r == 0:
                subst[os.path.splitext(q)[0]] = out
            else:
                # ⛔ DÉCLARER LE RÉGIME. Une assembly rouge n'est pas réinjectée : ses
                #    dépendantes retombent sur la DLL de `Library/ScriptAssemblies/`,
                #    c'est-à-dire sur la DERNIÈRE compilation réussie. Leur vert ne dit
                #    donc RIEN d'une rupture de signature introduite ici. Un dispositif
                #    inerte ressemble trait pour trait à un dispositif appliqué, sauf
                #    s'il dit dans quel état il est.
                aval = sorted(k for k, d in dep.items() if q in d)
                if aval:
                    print(f"   ⚠️ {os.path.splitext(q)[0]} est ROUGE ⇒ "
                          f"{', '.join(os.path.splitext(k)[0] for k in aval)} "
                          "sont vérifiées contre la DLL PÉRIMÉE — leur vert ne vaut rien ici.")
        sys.exit(rc)

    proj, extra = a[0], a[1:]
    subst = {}
    for nom in frais:
        r, _, out = compile_un(f'{nom}.csproj', [e for e in extra if f'/{nom}/' in e], muet=True)
        if r:
            print(f"⛔ l'assembly fraîche {nom} ne compile pas — recompile-la seule d'abord")
            compile_un(f'{nom}.csproj', [e for e in extra if f'/{nom}/' in e])
            sys.exit(1)
        print(f"[frais] {nom}.dll recompilée depuis les sources ⇒ les dépendantes pointent dessus")
        subst[nom] = out

    rc, _, _ = compile_un(proj, extra, subst=subst)

    if controle and extra:
        cible = extra[0]
        sauve = f'{TMP}/{os.path.basename(cible)}.bak'
        shutil.copy2(cible, sauve)
        try:
            with open(cible, 'a', encoding='utf-8') as f:
                f.write('\nclass ControlePositifDuTypecheck { int x = "pas un int"; }\n')
            r2, err2, _ = compile_un(proj, extra, subst=subst, muet=True)
            vu = any(os.path.basename(cible) in e for e in err2)
            print(f"[contrôle positif] faute injectée dans {cible} ⇒ EXIT={r2}, "
                  f"{len(err2)} erreur(s), citée dans ce fichier : {'OUI' if vu else '⛔ NON'}")
            if r2 == 0 or not vu:
                print("⛔ L'INSTRUMENT NE VOIT PAS CE FICHIER — le vert ci-dessus ne prouve RIEN.")
                rc = 1
        finally:
            shutil.copy2(sauve, cible)
    elif controle:
        print("⛔ --controle sans fichier supplémentaire : rien à instrumenter, contrôle NON exécuté.")
        rc = 1
    sys.exit(rc)


if __name__ == '__main__':
    main()
