#!/usr/bin/env python3
"""V15 — bijection COMPTÉE client ↔ back du lot `hl-card-apres-geste-servi` (CLIENT-2, 11/11).
Compare : les 10 clés de la réponse de `commit` (hl-card-types.ts ↔ CommitResponseDto), les 9 clés servies (4 `hl.outcome.<fournisseur>.executed`, 2 `hl.after_choice.*`,
3 `error.hl_card.*`) et leurs TEXTES FR à l'octet (string_table.ts ↔ BundleDuDesign du test), les 3 clés d'erreur du client (ApresGesteHl) et les 4 clés par fournisseur
(hl-option-table.ts). `--controle` renomme une clé côté client : la bijection DOIT rougir (rc 1). Usage : python3 Tools/verifier-bijection-hl-card-v15.py [--controle]
Racine du back : $BACK_HL_CARD (défaut : le worktree du lot, @35bdd6cb au 11/11). Rejoué au SHA du back, jamais déduit."""
import os
import re,sys
BACK=os.environ.get('BACK_HL_CARD','/home/erutheone/project/mafia-lot-aprespgeste/services/game-back/src/')
st=open(BACK+'i18n/string_table.ts',encoding='utf-8').read().split('\n')
types=open(BACK+'progression/loop10/hl-card-types.ts',encoding='utf-8').read()
opt=open(BACK+'progression/loop10/hl-option-table.ts',encoding='utf-8').read()
cs=open('Assets/Tests/PlayMode/CommitResponseDtoPlayModeTests.cs',encoding='utf-8').read()
apres=open('Assets/Scripts/Shell/ApresGesteHl.cs',encoding='utf-8').read()
dto=open('Assets/Scripts/Shell/HlCardClient.cs',encoding='utf-8').read()
mut=len(sys.argv)>1 and sys.argv[1]=='--controle'
def unesc(s): return s.replace('\\u00a0','\u00a0').replace("\\'","'")
# back FR : lignes 5512-5517 + erreurs 6167-6172 (cle sur une ligne, texte sur la suivante pour error.*)
fr={}
for i in range(5500,5520):
    m=re.match(r"\s*'(hl\.(?:outcome|after_choice)\.[^']+)':\s*'(.*)',\s*$",st[i])
    if m: fr[m.group(1)]=unesc(m.group(2))
for i in range(6160,6175):
    m=re.match(r"\s*'(error\.hl_card\.[^']+)':\s*$",st[i])
    if m:
        t=re.match(r"\s*'(.*)',\s*$",st[i+1]); fr[m.group(1)]=unesc(t.group(1))
print('back FR : %d clés'%len(fr))
# client : bundle du test
b=cs[cs.index('BundleDuDesign() =>'):]; b=b[:b.index('};')]
cli={}
for m in re.finditer(r'\{ "([^"]+)", "((?:[^"\\]|\\.)*)" \}',b):
    cli[m.group(1)]=m.group(2).replace('\\u00a0','\u00a0')
if mut: cli['hl.after_choice.noted_RENOMMEE']=cli.pop('hl.after_choice.noted')
print('client (bundle de test) : %d clés'%len(cli))
orph_c=sorted(set(cli)-set(fr)); orph_b=sorted(set(fr)-set(cli))
diff=[k for k in cli if k in fr and cli[k]!=fr[k]]
print('orphelins client (absents du back):',orph_c); print('orphelins back (absents du client):',orph_b); print('textes différents:',diff)
# 10 clés de la réponse
back10=re.findall(r'readonly (\w+)\??:',types[types.index('export interface HlCardCommitResponse'):types.index('One scored candidate')])
cli10=re.findall(r'public [\w\[\]]+ (\w+);',dto[dto.index('class CommitResponseDto'):dto.index('class CommitPayload')])
print('réponse back (%d):'%len(back10),sorted(back10)); print('DTO client (%d):'%len(cli10),sorted(cli10))
ok10=sorted(back10)==sorted(cli10)
# codes d'erreur : constantes client
ck=dict(re.findall(r'(Cle\w+) = "([^"]+)"',apres)); 
# 'public const string CleIntrouvable = "...", CleDejaTranchee = "...", ...'
ck=re.findall(r'"(error\.hl_card\.[a-z_]+)"',apres)
print('clés d\'erreur du client:',sorted(set(ck)))
okerr=sorted(set(ck))==sorted(k for k in fr if k.startswith('error.hl_card.'))
outs=sorted(set(re.findall(r"outcomeI18nKey: '([^']+)'",opt)))
print('hl.outcome fournisseurs back:',outs)
okout=outs==sorted(k for k in fr if k.startswith('hl.outcome.'))
ok=(not orph_c and not orph_b and not diff and ok10 and okerr and okout)
print('BIJECTION :', 'OK 0 orphelin' if ok else 'ÉCART'); sys.exit(0 if ok else 1)
