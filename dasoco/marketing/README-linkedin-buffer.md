# DASOCO — publication LinkedIn vidéo automatique

Objectif : une vidéo native LinkedIn les lundis, mercredis et vendredis à 10 h (Europe/Paris), sans action manuelle pour chaque post.

## État

Pipeline GitHub installé mais **non activable sans une clé d'API Buffer enregistrée en secret GitHub**.
Ne jamais placer la clé dans le code, une issue GitHub, un chat ou un fichier du dépôt public.

1. Dans Buffer, vérifier que le canal connecté est **la page entreprise LinkedIn DASOCO** et non le profil personnel.
2. Ouvrir https://publish.buffer.com/settings/api → Personal Access → New Key, intitulé « DASOCO-GitHub ». Activer au minimum `accountRead`, `postsRead`, `postsWrite`. Choisir une durée appropriée, idéalement 1 an.
3. Ouvrir https://github.com/woofer121/sites/settings/secrets/actions → New repository secret : nom exact `BUFFER_API_KEY`, valeur = clé complète Buffer.
4. Dans https://github.com/woofer121/sites/actions/workflows/dasoco-linkedin-buffer.yml, cliquer « Run workflow » pour un essai immédiat. Consulter la sortie du workflow et l'onglet Queue de Buffer.
5. Vérifier que la publication planifiée est une **vidéo native**, pas une publication texte ou un simple lien. Vérifier l'heure locale affichée dans Buffer.

## Fonctionnement

- GitHub Actions se déclenche chaque jour à 05:15 UTC pour préparer **le prochain** créneau lundi / mercredi / vendredi à 10 h Paris (heure d'été automatiquement respectée par Python).
- Recherche exclusive d'un canal Buffer `linkedin` dont le nom contient `DASOCO`. Refuse les autres pages ou profils.
- Avant création, contrôle dans Buffer les publications `scheduled` / `sent` proches du créneau choisi afin d'éviter les doublons.
- Enregistre avec Playwright les interactions **réelles** de trois démos du site DASOCO : mini-GMAO, suivi des demandes et tableau de bord.
- Produit un MP4 dynamique avec capture d'écran des applications, et utilise le monogramme officiel `dasoco/assets/brand-mark.svg`.
- Stocke le MP4 à `dasoco/media/linkedin/` : Render déploie automatiquement la nouvelle version du site.
- Attend une URL de vidéo publique servie en HTTPS avant de soumettre la publication à Buffer via l'API GraphQL, avec `schedulingType: automatic`, `mode: customScheduled` et média vidéo.
- Si l'accès échoue, aucune publication texte ou fausse vidéo n'est envoyée. Le workflow échoue explicitement.
- L'automatisation de veille/prospection DASOCO reste séparée. Les vidéos déjà publiées ne sont pas supprimées.

## Exploitation

Script : `scripts/dasoco_linkedin_autopost.py`  
Workflow : `.github/workflows/dasoco-linkedin-buffer.yml`  
Hébergement : `https://dasoco.onrender.com/media/linkedin/`  
Documentation officielle : https://developers.buffer.com/examples/create-video-post.html

**Contrôle indispensable** : le workflow ne vaut pas preuve de publication tant qu'un `PostActionSuccess` n'a pas retourné un identifiant Buffer, puis que le post n'est pas effectivement apparu sur LinkedIn. Les erreurs de l'API, l'expiration de la clé, les limites du plan Free ou les échecs de déploiement sont susceptibles d'empêcher une publication.

**Sécurité** : la clé Buffer personnelle est un secret. Ne jamais la communiquer en chat. Une clé de durée limitée devra être renouvelée avant son expiration.
