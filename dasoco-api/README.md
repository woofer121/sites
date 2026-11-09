# Envoi des demandes de contact

Le formulaire du site transmet les demandes à ce service Node.js. Le serveur envoie les messages via l'API HTTPS de Resend (aucune connexion SMTP sortante nécessaire).

## Configuration Render

Sur le service `dasoco-mail`, définir :

- `RESEND_API_KEY` : clé API secrète créée dans Resend.
- `CONTACT_TO` : adresse qui reçoit les demandes (par défaut `yohan.sube@gmail.com`).
- `ALLOWED_ORIGIN` : `https://dasoco.onrender.com`.
- `RESEND_FROM` : facultatif. Par défaut `DASOCO <onboarding@resend.dev>`.

## Mise en service sans nom de domaine

1. Créer un compte sur https://resend.com/.
2. Vérifier l'adresse e-mail du compte.
3. Créer une clé API dans la rubrique API Keys.
4. Ajouter cette clé dans Render > service `dasoco-mail` > Environment sous le nom `RESEND_API_KEY`.
5. Enregistrer et attendre le redéploiement.
6. Vérifier `https://dasoco-mail.onrender.com/health` : `configured` doit être `true`.

Avec l'adresse de test `onboarding@resend.dev`, Resend limite les destinataires à l'adresse e-mail propriétaire du compte Resend. Pour envoyer à d'autres destinataires et utiliser une adresse d'expédition DASOCO, il faudra ensuite vérifier un domaine dans Resend et configurer ses DNS. Aucun domaine personnalisé n'est requis pour le premier test si l'adresse de réception correspond à celle du compte Resend.

La clé API reste uniquement dans les variables d'environnement Render : ne jamais la publier dans GitHub ni la partager dans un message.

Le service conserve la validation des champs, le champ piège anti-robots et une limite de 8 demandes par IP sur 15 minutes.
