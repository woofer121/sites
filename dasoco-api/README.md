# Envoi des demandes de contact

Le formulaire du site transmet les demandes à ce petit service Node.js, qui les envoie via Resend. La clé API reste côté serveur et n'est jamais exposée au navigateur.

## Variables Render à définir sur le service `dasoco-mail`

- `RESEND_API_KEY` : clé API Resend (secret).
- `CONTACT_FROM` : expéditeur appartenant à un domaine vérifié dans Resend, par exemple `DASOCO <contact@dasoco.fr>`.
- `CONTACT_TO` : destinataire (par défaut `yohan.sube@gmail.com`).
- `ALLOWED_ORIGIN` : `https://dasoco.onrender.com`.

## Activation

1. Créer un compte Resend et ajouter le domaine d'envoi (idéalement `dasoco.fr`).
2. Publier les enregistrements DNS SPF/DKIM fournis par Resend chez le gestionnaire DNS du domaine.
3. Créer une clé API Resend et l'ajouter dans les variables d'environnement Render, sans la mettre dans GitHub.
4. Définir `CONTACT_FROM` avec une adresse du domaine vérifié.
5. Vérifier `https://dasoco-mail.onrender.com/health` : `configured` doit être `true`.

Le service limite les envois par adresse IP, valide les champs et utilise un champ piège anti-robots.
