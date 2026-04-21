# GestCom Backend API

Backend Node.js + Express + MongoDB pour l'application de gestion commerciale GestCom.

## Installation

1. Cloner le projet et naviguer dans le dossier backend
```bash
cd backend
```

2. Installer les dépendances
```bash
npm install
```

3. Créer le fichier `.env`
```bash
cp .env.example .env
```

4. Configurer les variables d'environnement dans `.env`:
```env
# Configuration de la base de données
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gestcom?retryWrites=true&w=majority

# Configuration du serveur
PORT=5000
NODE_ENV=development

# Clé secrète JWT (générez une clé sécurisée)
JWT_SECRET=votre_cle_secrete_jwt_tres_longue_et_securisee
JWT_EXPIRE=7d

# Configuration email (optionnel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app
```

## Démarrage

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm start
```

Le serveur démarrera sur `http://localhost:5000`

## Architecture

```
backend/
  config/
    database.js          # Connexion MongoDB
  controllers/
    authController.js    # Logique authentification
    userController.js     # Logique gestion utilisateurs
  middlewares/
    auth.js              # JWT et autorisation
    error.js             # Gestion globale des erreurs
  models/
    User.js              # Modèle utilisateur Mongoose
  routes/
    auth.js              # Routes authentification
    users.js             # Routes utilisateurs
  server.js              # Point d'entrée principal
  package.json
  .env.example
```

## API Endpoints

### Authentification

#### Inscription
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Connexion
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Déconnexion
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Mot de passe oublié
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Réinitialiser mot de passe
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "resetToken": "token_de_reset",
  "newPassword": "newpassword123"
}
```

#### Profil utilisateur
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Gestion des utilisateurs (Admin)

#### Liste des utilisateurs
```http
GET /api/users?page=1&limit=10&role=user&search=john
Authorization: Bearer <admin_token>
```

#### Statistiques utilisateurs
```http
GET /api/users/stats
Authorization: Bearer <admin_token>
```

#### Détails utilisateur
```http
GET /api/users/:id
Authorization: Bearer <admin_token>
```

#### Modifier le rôle
```http
PUT /api/users/:id/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "admin"
}
```

#### Supprimer utilisateur
```http
DELETE /api/users/:id
Authorization: Bearer <admin_token>
```

#### Mettre à jour profil
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

## Format des réponses

### Succès
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": {
    // données de la réponse
  }
}
```

### Erreur
```json
{
  "success": false,
  "message": "Message d'erreur",
  "errors": [] // optionnel, pour les erreurs de validation
}
```

## Sécurité

- **JWT**: Tokens JWT pour l'authentification
- **bcrypt**: Hash des mots de passe
- **Rate Limiting**: 100 requêtes par 15 minutes par IP
- **Helmet**: Sécurisation des headers HTTP
- **CORS**: Configuration CORS restrictive
- **Validation**: Validation des entrées avec express-validator

## Rôles

- **user**: Accès à son profil et fonctionnalités de base
- **admin**: Accès complet à la gestion des utilisateurs

## MongoDB Atlas

1. Créer un cluster MongoDB Atlas
2. Ajouter votre IP dans la liste blanche
3. Créer un utilisateur de base de données
4. Copier la chaîne de connexion dans `MONGODB_URI`

## Déploiement

### Variables d'environnement de production
```env
NODE_ENV=production
MONGODB_URI=votre_uri_mongodb_production
JWT_SECRET=votre_cle_secrete_production_tres_longue
PORT=5000
```

### Commandes
```bash
# Installation des dépendances
npm install --production

# Démarrage du serveur
npm start
```

## Tests d'API

Utilisez Postman ou Insomnia pour tester les endpoints. Importez les exemples suivants:

### Postman Collection
```json
{
  "info": {
    "name": "GestCom API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["api", "auth", "register"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000"
    }
  ]
}
```

## Support

Pour toute question ou problème, consultez la documentation ou contactez l'équipe de développement.
