#!/usr/bin/env python3 -I
"""Juge donnees — journal (38) — maquette t2 — mesure de B sur la pile locale.

Compte JETABLE frais (jd3-*). AUCUN POST hors signup/session-open (interdit du dossier :
pas de POST /v1/ambient/attend/:id — l'evenement est GLOBAL, le geste le consommerait pour tous).
Chaque corps : octets ecrits COMPARES a Content-Length (piege outil mesure du dossier).
Le jeton n'est JAMAIS ecrit dans un fichier (masque 'Bearer ***').
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = "http://localhost"
OUT = os.path.dirname(os.path.abspath(__file__))


def call(method, path, body=None, token=None, label=None):
    url = BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    if method == "POST" and path.endswith("/auth/signup"):
        headers["Idempotency-Key"] = str(uuid.uuid4())
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=30)
        status, hdrs, raw = r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        status, hdrs, raw = e.code, dict(e.headers), e.read()
    cl = hdrs.get("Content-Length")
    rec = {
        "label": label or path,
        "request": "%s %s" % (method, url),
        "auth": "Bearer ***" if token else None,
        "status": status,
        "X-Server-Build": hdrs.get("X-Server-Build"),
        "Content-Length_header": cl,
        "bytes_read": len(raw),
        "length_match": (cl is None) or (int(cl) == len(raw)),
    }
    try:
        rec["body"] = json.loads(raw.decode("utf-8"))
    except Exception:
        rec["body"] = raw.decode("utf-8", "replace")
    return rec


def masked(rec):
    """Copie du record avec tout jeton/mot de passe masque."""
    c = json.loads(json.dumps(rec))

    def scrub(o):
        if isinstance(o, dict):
            for k in list(o.keys()):
                if any(s in k.lower() for s in ("token", "password", "secret", "refresh")):
                    o[k] = "***"
                else:
                    scrub(o[k])
        elif isinstance(o, list):
            for x in o:
                scrub(x)

    scrub(c)
    return c


def write(name, rec):
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(masked(rec), f, indent=1, ensure_ascii=False, sort_keys=True)
    print("[%s] status=%s CL=%s bytes=%s match=%s build=%s -> %s" % (
        rec["label"], rec["status"], rec["Content-Length_header"], rec["bytes_read"],
        rec["length_match"], rec["X-Server-Build"], name))
    return rec


cs = "jd3-%d" % int(time.time())
pw = "pw-" + cs

su = call("POST", "/v1/auth/signup", {"callsign": cs, "password": pw}, label="auth/signup")
write("00-signup.json", su)
if su["status"] not in (200, 201):
    print("SIGNUP FAILED", file=sys.stderr)
    sys.exit(2)
tok = su["body"]["payload"]["data"]["access_token"]

write("01-session-open.json", call("POST", "/v1/session/open", {"client_version": "jd-0.0"}, tok, "session/open"))

for name, path in [
    ("02-ambient-feed.json", "/v1/ambient/feed"),
    ("03-news-feed.json", "/v1/news/feed"),
    ("04-random-world-active.json", "/v1/random-world/active"),
    ("05-random-world-known-couplings.json", "/v1/random-world/known-couplings"),
    ("06-news-feed-limit100.json", "/v1/news/feed?limit=100"),
    ("07-ambient-feed-limit100.json", "/v1/ambient/feed?limit=100"),
]:
    write(name, call("GET", path, None, tok, path))

# Le compte frais n'a peut-etre aucun batiment -> ambient/random-world vides.
# On mesure AUSSI avec une categorie de news pour voir le filtre.
write("08-news-feed-brennar-local.json",
      call("GET", "/v1/news/feed?category=brennar_local", None, tok, "/v1/news/feed?category=brennar_local"))

print("callsign jetable utilise : %s (mot de passe NON ecrit)" % cs)
