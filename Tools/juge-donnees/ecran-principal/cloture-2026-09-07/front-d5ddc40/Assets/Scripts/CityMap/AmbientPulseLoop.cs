using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.CityMap
{
    // W3.U2 C10 (design §3 C10, engagement 7 — U-12 : boucles ambiantes, budgétées). Une "boucle
    // ambiante" est une MICRO-MOTION discrète sur une source lumineuse déjà branchée à un fait du
    // back (engagement 3) — jamais un VFX plein écran, et jamais un objet qui n'existerait pas sans
    // elle : ce composant est ajouté SUR une Image que BuildRevenueSign/BuildActivitySmoke/
    // BuildMaintenanceFlicker ont déjà créée pour une VRAIE raison de donnée (C9) ; il se contente
    // d'ANIMER son alpha dans une bande étroite. Le budget (≤4 simultanées, C10-F2) est appliqué EN
    // AMONT par DistrictInteriorScreenController.TryStartAmbientLoop — ce composant ne connaît rien
    // du budget, il exécute la boucle qu'on l'a déjà autorisé à démarrer.
    public class AmbientPulseLoop : MonoBehaviour
    {
        private const float Amplitude = 0.12f; // bande étroite — "discrète", jamais un flash plein alpha
        private const float Speed = 1.6f;      // cycle lent — jamais un strobe

        private Graphic target;
        private float baseAlpha;
        private float phaseOffset;

        private void Awake()
        {
            target = GetComponent<Graphic>();
            if (target == null) return;
            baseAlpha = target.color.a;
            // Déphasage par instance — sans lui, les boucles pulseraient À L'UNISSON, ce qui LIT
            // comme un seul effet plein écran plutôt que des sources indépendantes (engagement 7 :
            // l'intensité du feedback doit rester proportionnée, jamais un flash synchronisé global).
            phaseOffset = Random.Range(0f, Mathf.PI * 2f);
        }

        private void Update()
        {
            if (target == null) return;
            float a = baseAlpha + Mathf.Sin(Time.time * Speed + phaseOffset) * Amplitude;
            Color c = target.color;
            c.a = Mathf.Clamp01(a);
            target.color = c;
        }
    }
}
