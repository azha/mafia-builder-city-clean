using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace MafiaCleanCity.Tests
{
    /// <summary>Icônes d'action sur la carte (ruling user 2026-09-07) — le DÉTECTEUR de la dette
    /// que `CarteActionResolver` assume, plus les gardes du résolveur lui-même.
    ///
    /// ⛔⛔ POURQUOI CE TEST EXISTE, ET POURQUOI UNE NOTE N'AURAIT PAS SUFFI.
    /// Le résolveur DUPLIQUE côté client une liste de types qui vit côté back
    /// (`district-interior.projection.service.ts`, `activityBand`). Le jour où le back ajoute un
    /// `operational_type`, **rien ne compile en rouge** : c'est un changement de DONNÉE, pas de
    /// type. Et la forme auto-invalidante habituelle ne transpose pas au C# — une `switch`
    /// expression ne rend qu'un avertissement CS8509, et il y en a **0** dans tout `Assets/Scripts`.
    /// ⇒ Le seul détecteur qui puisse voir cet événement est une assertion de PARCOURS sur
    /// l'ENSEMBLE des types RÉELLEMENT projetés. *Une dette consignée sans détecteur est une prose
    /// datée : vraie le jour où on l'écrit, fausse sans que personne ne le sache.*
    ///
    /// ⛔ GARDE ANTI-VACUITÉ, et elle n'est pas décorative : « aucun type inconnu » est
    /// trivialement VRAI sur zéro bâtiment. Une base non semée, une route en erreur, un district
    /// vide — et l'assertion reste verte pour toujours en ne mesurant rien. On exige donc un
    /// PLANCHER de bâtiments observés, et on IMPRIME le compte.</summary>
    [Category("CarteActions")]
    public class CarteActionsPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;

        [UnityTest]
        public IEnumerator CarteActions_LesTypesProjetes_SontTousConnusDuResolveur()
        {
            string token = null;
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("carte-actions", ref callsignSeq);
            string err = null;
            yield return auth.SignUp(callsign, "carte-actions-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var session = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto ouverture = null;
            yield return session.OpenSession(token, "e2e-carte-actions", d => ouverture = d,
                (c, m) => Assert.Fail($"session/open a échoué : {c}: {m}"));
            Assert.IsNotNull(ouverture, "session/open doit réussir — c'est elle qui donne le kit de départ");

            // Balayer les districts du joueur maximise la couverture de types observés : un seul
            // district ne prouve presque rien, et le compte est ce qui rend l'assertion probante.
            var world = new WorldApiClient { BaseUrl = BaseUrl };
            List<DistrictDto> districts = null;
            string derr = null;
            yield return world.GetDistricts(d => districts = d, e => derr = e);
            Assert.IsNull(derr, $"la liste des districts doit être servie : {derr}");
            Assert.IsNotNull(districts, "la liste des districts doit être servie");
            Assert.Greater(districts.Count, 0, "⛔ aucun district — la mesure n'aurait rien à balayer");

            var client = new CityProjectionsClient { BaseUrl = BaseUrl };
            var typesVus = new HashSet<string>();
            int batiments = 0;
            foreach (var d in districts)
            {
                DistrictInteriorDto dto = null;
                yield return client.Interior(d.id, token, x => dto = x, _ => { });
                if (dto?.buildings == null) continue;
                foreach (var b in dto.buildings)
                {
                    batiments++;
                    if (!string.IsNullOrEmpty(b.operational_type)) typesVus.Add(b.operational_type);
                }
            }

            // ⛔ Plancher AVANT toute comparaison d'ensembles : 0 bâtiment satisfait « aucun type
            //    inconnu » sans rien mesurer.
            Debug.Log($"[CarteActions] {districts.Count} district(s) balayé(s) · {batiments} bâtiment(s) · "
                      + $"types observés = [{string.Join(", ", typesVus.OrderBy(t => t))}]");
            Assert.Greater(batiments, 0,
                "⛔ AUCUN bâtiment projeté : l'assertion d'ensemble serait vraie À VIDE et le "
                + "resterait pour toujours. Ce n'est pas « rien d'inconnu », c'est « rien mesuré ».");

            // ⛔⛔ LE DÉNOMINATEUR, ET IL BORNE CE QUE CE TEST PROUVE. Une garde anti-vacuité dit
            //    « on a mesuré quelque chose » ; elle ne dit PAS que le scénario est DIMENSIONNÉ.
            //    Mesuré au premier run : un compte FRAIS ne porte que 4 des 12 types
            //    (cash_safehouse, front_shop, lab, stash) — le kit de départ n'en pose pas plus.
            //    ⇒ Ce test attrape un type neuf UNIQUEMENT s'il apparaît dans le kit de départ.
            //    Les 8 autres types ne sont pas couverts par ce scénario, et le dire est la
            //    différence entre un instrument et une affirmation.
            Debug.Log($"[CarteActions] COUVERTURE : {typesVus.Count}/{CarteActionResolver.TypesConnus.Count} "
                      + "types de l'enum exercés par ce scénario — les autres ne sont PAS couverts ici.");

            var inconnus = typesVus.Where(t => !CarteActionResolver.TypesConnus.Contains(t)).ToArray();
            Assert.IsEmpty(inconnus,
                $"⛔ le back projette {inconnus.Length} type(s) que le résolveur de la carte ne "
                + $"connaît pas : [{string.Join(", ", inconnus)}]. C'est la DETTE assumée par "
                + "`CarteActionResolver` qui vient de se réaliser — la liste des types relançables "
                + "est dupliquée côté client. Deux réparations : l'étendre ici (court terme), ou "
                + "consommer un `relance_band` projeté par le back (propre). Ne PAS se contenter "
                + "d'ajouter le type à `TypesConnus` sans décider s'il est relançable.");

            // Et l'effet, pas seulement la liste : sur des données réelles, le résolveur ne doit
            // jamais rendre son repli.
            foreach (var d in districts)
            {
                DistrictInteriorDto dto = null;
                yield return client.Interior(d.id, token, x => dto = x, _ => { });
                if (dto?.buildings == null) continue;
                foreach (var b in dto.buildings)
                {
                    var a = CarteActionResolver.Resoudre(b.operational_type, b.activity_band,
                        b.condition_band, b.lapse_phase_bucket, b.maintenance_in_progress);
                    Assert.AreNotEqual(CarteActionResolver.Action.Inconnu, a,
                        $"⛔ repli `Inconnu` sur un bâtiment RÉEL (type « {b.operational_type} ») — "
                        + "le résolveur ne sait pas classer ce que le back projette.");
                }
            }
        }

        [Test]
        public void CarteActions_IdleSeul_NeSuffitPas_UnBureauNEstPasRelancable()
        {
            // ⛔ LA GARDE QUI PORTE TOUT LE LOT. `IDLE` confond « à l'arrêt » et « aucune activité
            //    par nature ». Si cette assertion tombe, l'icône « relance-moi » réapparaît sur les
            //    bureaux, les planques et les caches — et envoie le joueur cliquer dans le vide.
            foreach (var inerte in new[] { "office", "stash", "cash_safehouse", "front_shop",
                                           "distribution_hub", "money_holding" })
            {
                var a = CarteActionResolver.Resoudre(inerte, "IDLE", "SOUND", "WITHIN_WINDOW", false);
                Assert.AreEqual(CarteActionResolver.Action.Aucune, a,
                    $"⛔ « {inerte} » est IDLE par nature, pas à l'arrêt : aucune icône ne doit s'y poser.");
            }
            // Contrôle positif : la garde sait dire OUI, sinon elle serait verte en ne voyant rien.
            foreach (var vivant in new[] { "lab", "grow_house", "dealer_spot_front", "refinery",
                                           "press_house", "specialized_lab" })
            {
                var a = CarteActionResolver.Resoudre(vivant, "IDLE", "SOUND", "WITHIN_WINDOW", false);
                Assert.AreEqual(CarteActionResolver.Action.Relancer, a,
                    $"⛔ « {vivant} » à l'arrêt DOIT proposer la relance — sans ça la garde ci-dessus "
                    + "serait satisfaite par un résolveur qui ne propose jamais rien.");
            }
        }

        [Test]
        public void CarteActions_CeQuiEstDejaEnCours_NInvitePas()
        {
            // Ton non punitif : on ne demande pas de lancer ce qui tourne déjà.
            Assert.AreEqual(CarteActionResolver.Action.Aucune,
                CarteActionResolver.Resoudre("lab", "IDLE", "REPAIRING", "WITHIN_WINDOW", false),
                "une réparation EN COURS n'est pas une invite à réparer");
            Assert.AreEqual(CarteActionResolver.Action.Aucune,
                CarteActionResolver.Resoudre("lab", "IDLE", "DAMAGED", "CRITICAL", true),
                "`maintenance_in_progress` dit la même chose par un autre champ — les deux taisent l'icône");
            // Et la priorité : abîmé passe devant à l'arrêt.
            Assert.AreEqual(CarteActionResolver.Action.Reparer,
                CarteActionResolver.Resoudre("lab", "IDLE", "DAMAGED", "WITHIN_WINDOW", false),
                "un bâtiment abîmé qu'on relance reste abîmé — RÉPARER passe devant RELANCER");
        }
    }
}
