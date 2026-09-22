#!/usr/bin/env python3
"""Extension de sites-libelle.py (2026-09-23) : les littéraux qui atteignent `Libelle.De`/`ParValeur` (ou une aide qui y renvoie)
PAR UNE VARIABLE — deux flux que la version directe ne voit pas, mesurés comme la cause des 30 clés que la garde des locataires a
trouvées sur le vrai rendu :
  (A) un local ASSIGNÉ (`titre = "C'est livré"; … Libelle.De("distribution","titre", titre)`), dans la même méthode ;
  (B) un PARAMÈTRE (`void Ligne(string libelle) { … Libelle.De("appro","bloc", libelle) }` appelé `Ligne("À quoi ça sert")`),
      un niveau d'appel, même fichier.
Toujours une borne (pas un analyseur C#) : elle s'ajoute au direct, elle ne le remplace pas.
Usage : python3 Tools/juge-donnees/i18n/sites-libelle-flux.py <string_table.ts> <sortie.json>"""
import re,sys,json,pathlib,unicodedata
def slug(s):
    out=[]
    for c in unicodedata.normalize('NFD',s):
        if unicodedata.category(c)=='Mn': continue
        if c.isalnum(): out.append(c.lower())
        elif out and out[-1]!='_': out.append('_')
    return ''.join(out).strip('_')
def dec(l): return re.sub(r'\\(u[0-9a-fA-F]{4}|.)', lambda m: chr(int(m.group(1)[1:],16)) if m.group(1)[0]=='u' else {'n':'\n','t':'\t','r':'\r','0':'\0'}.get(m.group(1),m.group(1)), l)
def sans_comm(t): return re.sub(r'("(?:\\.|[^"\\\n])*")|//[^\n]*|/\*[\s\S]*?\*/', lambda m: m.group(1) or '', t)
LIT=r'(?<![\$@])"((?:\\.|[^"\\\n])*)"'
table=open(sys.argv[1],encoding='utf-8').read()
servies=set(re.findall(r"^\s*'([^'\s]+\.[^'\s]+)'\s*:",table,re.M))
def methodes(t):
    for m in re.finditer(r'(?m)^\s{8}(?:(?:public|private|protected|internal|static|override|virtual)\s+)+[\w<>\[\],. ?]+?\s(\w+)\s*\(([^;{)]*)\)\s*\{',t):
        j=m.end()-1; d=0
        for k in range(j,len(t)):
            d+= t[k]=='{'; d-= t[k]=='}'
            if d==0: break
        params=[p.strip().split()[-1] for p in m.group(2).split(',') if p.strip()]
        yield m.group(1), params, j, k
res={}
for p in sorted(pathlib.Path('Assets/Scripts').rglob('*.cs')):
    t=sans_comm(p.read_text(encoding='utf-8',errors='replace'))
    helpers={}
    for m in re.finditer(r'static string (\w+)\(\s*string (\w+)\s*\)\s*(?:=>|\{\s*return)\s*(?:MafiaCleanCity\.I18n\.)?Libelle\.De\(\s*"(\w+)"\s*,\s*"(\w+)"\s*,\s*\2\s*\)',t): helpers[m.group(1)]=(m.group(3),m.group(4))
    # appels qui passent un IDENTIFIANT : (domaine, rôle, ident, position)
    appels=[]
    for m in re.finditer(r'(?:MafiaCleanCity\.I18n\.)?Libelle\.(?:De|ParValeur)\(\s*"(\w+)"\s*,\s*"(\w+)"\s*,\s*([A-Za-z_]\w*)\s*[,)]',t): appels.append((m.group(1),m.group(2),m.group(3),m.start()))
    for h,(d,r) in helpers.items():
        for m in re.finditer(rf'(?<![\w.]){h}\(\s*([A-Za-z_]\w*)\s*\)',t): appels.append((d,r,m.group(1),m.start()))
    meths=list(methodes(t)); sites=[]
    for d,r,v,pos in appels:
        enc=[(n,ps,a,b) for n,ps,a,b in meths if a<pos<b]
        if not enc: continue
        n,ps,a,b=enc[-1]; corps=t[a:b]
        # (A) assignations du local dans la méthode
        for m in re.finditer(rf'(?:\bstring\s+)?(?<![\w.]){v}\s*=(?!=)\s*([^;]+);',corps):
            for l in re.findall(LIT,m.group(1)): sites.append((f'{d}.{r}.{slug(dec(l))}',l,'A',n))
        # (B) paramètre : littéraux passés à cette position par les appelants du même fichier
        if v in ps:
            i=ps.index(v)
            for m in re.finditer(rf'(?<![\w.]){n}\s*\(',t):
                if a-200<m.start()<a+5: continue   # la déclaration elle-même
                k=m.end(); d2=1; args=[]; cur=''; q=False
                while k<len(t) and d2>0:
                    c=t[k]
                    if c=='"' and t[k-1]!='\\': q=not q
                    if not q and c in '([{': d2+=1
                    if not q and c in ')]}': d2-=1
                    if d2==0: break
                    if not q and c==',' and d2==1: args.append(cur); cur=''
                    else: cur+=c
                    k+=1
                args.append(cur)
                if i<len(args):
                    lm=re.fullmatch(r'\s*'+LIT+r'\s*',args[i])
                    if lm: sites.append((f'{d}.{r}.{slug(dec(lm.group(1)))}',lm.group(1),'B',n))
    sites=[s for s in set(sites) if not s[0].endswith('.')]
    if sites: res[str(p)]=[{'cle':c,'litteral':l,'flux':f,'methode':m,'servie':c in servies} for c,l,f,m in sorted(sites)]
json.dump(res,open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False,indent=1)
tot=sum(len(v) for v in res.values()); ns=sorted({s['cle'] for v in res.values() for s in v if not s['servie']})
print(f"flux A/B : {tot} sites dans {len(res)} fichiers · {len(ns)} clé(s) non servie(s)")
for c in ns: print('  ',c)

# ⛔ CONTRÔLE POSITIF (consigne de l'orchestrateur, 23/09) : les 4 sites de Distribution que la garde a vus au rejeu de 01:42 —
#    des littéraux ASSIGNÉS (`titre = "C'est livré"`) — doivent être vus ici. Sinon le flux (A) ne mord plus, et son « 0 » ne vaut rien.
CONTROLE={'distribution.titre.c_est_livre','distribution.sous_titre.la_marchandise_est_arrivee_voila_ce_que_le_trajet_a_coute_a_la_route',
          'distribution.bloc.livre_le_carton_est_au_comptoir_personne_n_a_rien_vu','distribution.bouton.tendre_une_autre_ficelle'}
vus={s['cle'] for v in res.values() for s in v}
manque=sorted(CONTROLE-vus)
if manque: print('⛔ CONTRÔLE POSITIF ROUGE — le flux ne voit plus :',manque); sys.exit(1)
print('✅ contrôle positif : les 4 sites de Distribution (flux A) sont vus')
