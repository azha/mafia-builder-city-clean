#!/usr/bin/env python3
# Juge donnees r2 — le TITRE de la carte de tete.
# `LibellesDecision.Type(k)` -> Libelle.Gabarit("decision.type."+k, null) -> IcuFormat.Formater(motif, null).
# `IcuFormat.Resoudre` (I18nCatalog.cs:209-215) : genre=="plural" et `n` absent de `p`
#   => long.TryParse(null) echoue => RENVOIE "{"+corps+"}" (le bloc ICU BRUT).
# Donc : tout `decision.type.<PROVIDER>` servi comme pluriel ICU rend des ACCOLADES a l'ecran.
# Ici on COMPTE, pour les 8 fournisseurs HL du catalogue, lesquels sont des pluriels ICU.
import json, re

BUNDLE = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/04-accueil/r2-2026-10-09/mesures/04-i18n-bundle-fr.json'
msg = json.load(open(BUNDLE, encoding='utf-8'))['payload']['data']['messages']

# Les 8 cles du catalogue HL, recopiees de hl-card-types.ts:86-97 (codes 101-108).
PROVIDERS = ['DAMAGED_BUILDING_REPAIR', 'SEVERED_ROUTE_REBUILD', 'ESCALATION_BACKLOG_REVIEW',
             'AUTONOMY_REPORTS_PENDING', 'LEGAL_CASE_DECISION', 'BACKPRESSURE_CRITICAL_TRACE',
             'MYCELIAL_STRESSED_LEG', 'CUE_CASCADE_FALLOUT']

def rend_icu_brut(motif):
    """Reproduit la DECISION de IcuFormat.Resoudre pour p == null (aucun parametre)."""
    if motif is None:
        return False
    # un argument ICU de la forme {arg, plural, ...} ou {arg, select, ...} ; p==null => valeur null
    return re.search(r'\{\s*\w+\s*,\s*plural\s*,', motif) is not None

print('cle `decision.type.<PROVIDER>` pour les 8 fournisseurs HL (catalogue hl-card-types.ts:86-97)')
print()
pluriels, simples, absents = [], [], []
for k in PROVIDERS:
    cle = 'decision.type.' + k
    v = msg.get(cle)
    if v is None:
        absents.append(k); etat = 'ABSENT DU BUNDLE'
    elif rend_icu_brut(v):
        pluriels.append(k); etat = 'PLURIEL ICU -> ACCOLADES A L ECRAN'
    else:
        simples.append(k); etat = 'texte simple -> OK'
    print(f'  {k:30} {etat}')
    print(f'      servi = {v!r}')

print()
print(f'|pluriels ICU| = {len(pluriels)}  -> {pluriels}')
print(f'|texte simple| = {len(simples)}  -> {simples}')
print(f'|absents|      = {len(absents)}  -> {absents}')
print(f'somme = {len(pluriels)+len(simples)+len(absents)} / 8 fournisseurs')

print()
print('=== CONTROLE POSITIF du detecteur (cles citees par I18nCatalog.cs:151-153 comme pluriel/select) ===')
for cle in ['game.lieutenant.assignment.summary', 'game.lieutenant.recap.actions_taken']:
    v = msg.get(cle)
    print(f'  {cle} pluriel_detecte={rend_icu_brut(v)}')
    print(f'      servi = {str(v)[:150]!r}')

print()
print('=== CONTROLE NEGATIF (une cle qu on sait SANS accolade) ===')
for cle in ['hl.option.damaged_building.repair_via_queue']:
    print(f'  {cle} pluriel_detecte={rend_icu_brut(msg.get(cle))}  servi={msg.get(cle)!r}')

print()
print('=== combien de `decision.type.*` servies au total, et combien pluriels ===')
tous = [k for k in msg if k.startswith('decision.type.')]
pl = [k for k in tous if rend_icu_brut(msg[k])]
print(f'  |decision.type.*| servies = {len(tous)} ; dont pluriels ICU = {len(pl)}')
