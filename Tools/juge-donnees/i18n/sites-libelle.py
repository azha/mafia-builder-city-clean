#!/usr/bin/env python3
"""Sites Libelle À LITTÉRAL par fichier (Libelle.De / ParValeur, et les aides à 1 ou 2 paramètres qui y renvoient),
clé dérivée (slug du littéral DÉCODÉ) et « servie ? » contre un instantané de string_table.ts du back.
Borne BASSE : une aide au corps plus riche (Manque, RenderBar…) n échappe au motif — voir orphelines.py.
Usage : python3 Tools/juge-donnees/i18n/sites-libelle.py <string_table.ts> <sortie.json>"""
import re,pathlib,sys,unicodedata,json,collections
sys.path.insert(0,'Tools/juge-donnees/i18n')
def slug(s):
    out=[]
    for c in unicodedata.normalize('NFD',s):
        if unicodedata.category(c)=='Mn': continue
        if c.isalnum(): out.append(c.lower())
        elif out and out[-1]!='_': out.append('_')
    return ''.join(out).strip('_')
table=open(sys.argv[1],encoding='utf-8').read()
servies=set(re.findall(r"^\s*'([^'\s]+\.[^'\s]+)'\s*:",table,re.M))   # toute lettre : la table sert « nœud »
def dec(l):
    return re.sub(r'\\(u[0-9a-fA-F]{4}|.)', lambda m: chr(int(m.group(1)[1:],16)) if m.group(1)[0]=='u' else {'n':'\n','t':'\t','r':'\r','0':'\0'}.get(m.group(1),m.group(1)), l)
def sans_comm(t): return re.sub(r'("(?:\\.|[^"\\\n])*")|//[^\n]*|/\*[\s\S]*?\*/', lambda m: m.group(1) or '', t)
LIT=r'"((?:\\.|[^"\\\n])*)"'
res={}
for p in sorted(pathlib.Path('Assets/Scripts').rglob('*.cs')):
    t=sans_comm(p.read_text(encoding='utf-8',errors='replace'))
    helpers={}
    # aide à 1 paramètre : string X(string a) => …Libelle.De("d","r", a)
    for m in re.finditer(r'static string (\w+)\(\s*string (\w+)\s*\)\s*(?:=>|\{\s*return)\s*(?:MafiaCleanCity\.I18n\.)?Libelle\.De\(\s*"(\w+)"\s*,\s*"(\w+)"\s*,\s*\2\s*\)',t):
        helpers[m.group(1)]=('1',m.group(3),m.group(4))
    # aide à 2 paramètres : string X(string role, string a) => …Libelle.De("d", role, a)
    for m in re.finditer(r'static string (\w+)\(\s*string (\w+)\s*,\s*string (\w+)\s*\)\s*(?:=>|\{\s*return)\s*(?:MafiaCleanCity\.I18n\.)?Libelle\.De\(\s*"(\w+)"\s*,\s*\2\s*,\s*\3\s*\)',t):
        helpers[m.group(1)]=('2',m.group(4),None)
    sites=[]
    for m in re.finditer(r'(?:MafiaCleanCity\.I18n\.)?Libelle\.De\(\s*"(\w+)"\s*,\s*"(\w+)"\s*,\s*'+LIT+r'\s*\)',t):
        sites.append((m.start(),f'{m.group(1)}.{m.group(2)}.{slug(dec(m.group(3)))}',m.group(3)))
    for h,(k,d,r) in helpers.items():
        if k=='1':
            for m in re.finditer(rf'(?<![\w.]){h}\(\s*'+LIT+r'\s*\)',t): sites.append((m.start(),f'{d}.{r}.{slug(dec(m.group(1)))}',m.group(1)))
        else:
            for m in re.finditer(rf'(?<![\w.]){h}\(\s*"(\w+)"\s*,\s*'+LIT+r'\s*\)',t): sites.append((m.start(),f'{d}.{m.group(1)}.{slug(dec(m.group(2)))}',m.group(2)))
    for m in re.finditer(r'Libelle\.ParValeur\(\s*"(\w+)"\s*,\s*"(\w+)"\s*,\s*'+LIT,t):
        sites.append((m.start(),f'{m.group(1)}.{m.group(2)}.{slug(dec(m.group(3)))}','(valeur) '+m.group(3)))
    if not sites: continue
    # méthode englobante
    meths=[(mm.start(),mm.group(1)) for mm in re.finditer(r'(?m)^\s{8}(?:(?:public|private|protected|internal|static|override|virtual)\s+)+[\w<>\[\],. ]+?\s(\w+)\s*\([^;{]*\)\s*(?:=>|\{)',t)]
    out=[]
    for pos,cle,lit in sorted(set(sites)):
        if cle.endswith('.'): continue   # slug vide : Libelle.De ne demande AUCUNE clé
        meth=max([mm for mm in meths if mm[0]<pos],default=(0,'?'))[1]
        out.append({'ligne':t.count('\n',0,pos)+1,'methode':meth,'cle':cle,'litteral':lit,'servie':cle in servies})
    res[str(p)]=out
json.dump(res,open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False,indent=1)
tot=sum(len(v) for v in res.values()); ns=sum(1 for v in res.values() for s in v if not s['servie'])
print(f"{len(servies)} clés dans la table · {len(res)} fichiers · {tot} sites littéraux · {ns} dont la clé n'est pas servie")
