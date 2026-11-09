# Envoi des demandes de contact

Le formulaire du site transmet les demandes à ce service Node.js, qui les envoie via le serveur SMTP Gmail. Les identifiants restent côté serveur et ne sont jamais exposés au navigateur.

## Variables Render à définir sur le service `dasoco-mail`

- `GMAIL_USER` : adresse Gmail complète utilisée pour l'envoi.
- `GMAIL_APP_PASSWORD` : mot de passe d'application Google (secret de 16 caractères, sans espaces). Ne jamais utiliser le mot de passe normal du compte.
- `CONTACT_TO` : adresse destinataire (par défaut la valeur de `GMAIL_USER`).
- `ALLOWED_ORIGIN` : `https://dasoco.onrender.com`.

## Activation avec un compte Gmail personnel

1. Activer la validation en deux étapes du compte Google.
2. Créer un mot de passe d'application depuis https://myaccount.google.com/apppasswords.
3. Dans Render, ouvrir le service `dasoco-mail`, puis Environment.
4. Ajouter `GMAIL_USER` et `GMAIL_APP_PASSWORD`. Saisir le mot de passe d'application directement dans Render, jamais dans GitHub ou dans une conversation.
5. Enregistrer les changements et attendre le redéploiement.
6. Vérifier `https://dasoco-mail.onrender.com/health` : `configured` doit être `true`.

Le service utilise SMTP Gmail sur `smtp.gmail.com:465` en TLS. Un compte Gmail personnel est soumis aux limites d'envoi de Google (jusqu'à 500 messages par jour selon la documentation Gmail). Le service limite aussi les envois par adresse IP, valide les champs et utilise un champ piège anti-robots.

Quand DASOCO disposera à nouveau d'un domaine, il sera possible de revenir à un fournisseur transactionnel et à une adresse professionnelle sur ce domaine.
