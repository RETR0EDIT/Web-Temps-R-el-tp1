# Suivi de commandes en direct

Suivi de commandes d'une boutique en ligne avec Express 5, TypeScript et Server-Sent Events codés à la main.

Dépôt Git : https://github.com/RETR0EDIT/Web-Temps-R-el-tp1

## Lancement

```bash
docker compose up --build -d
```

Le site répond sur http://localhost:3000.

- `/` : la boutique (stock, création de commande, liste des commandes).
- `/suivi.html?id=1` : la page de suivi de la commande 1.

Les données sont stockées avec JsonDB dans le volume Docker `data` et restent après un redémarrage.

## API REST

Les erreurs renvoient `{ "error": "message" }`.

| Méthode | Route | Description | Codes |
|---|---|---|---|
| GET | `/users` | Liste des utilisateurs | 200 |
| GET | `/products` | Liste des produits avec leur stock | 200 |
| GET | `/orders` | Liste des commandes | 200 |
| GET | `/orders/:id` | Détail d'une commande | 200, 404 |
| POST | `/orders` | Crée une commande | 201, 400, 404, 409 |
| PATCH | `/orders/:id/status` | Change le statut d'une commande | 200, 400, 404, 409 |

### POST /orders

Corps : `{ "userId": 1, "productId": 2, "quantity": 3 }`

- 201 : commande créée avec le statut `preparing`, et le stock du produit diminue.
- 400 : un champ manque ou n'est pas un entier positif.
- 404 : le client ou le produit n'existe pas.
- 409 : le stock est insuffisant.

### PATCH /orders/:id/status

Corps : `{ "status": "shipped" }`, avec `shipped`, `delivered` ou `cancelled`.

- 200 : statut changé.
- 400 : statut invalide.
- 404 : la commande n'existe pas.
- 409 : transition interdite. Le statut avance d'un cran à la fois (`preparing`, puis `shipped`, puis `delivered`). Seule une commande `preparing` peut passer à `cancelled`, et son stock est alors rendu au produit.

20 secondes après le passage à `shipped`, le serveur passe seul la commande à `delivered`.

## Flux SSE

| Route | Contenu |
|---|---|
| GET `/events` | Tous les événements de la boutique |
| GET `/orders/:id/events` | Seulement les événements de la commande `:id` (404 si elle n'existe pas) |

Événements :

- `order-created` : une commande est créée (data = la commande).
- `order-status` : le statut d'une commande change (data = la commande).
- `order-cancelled` : une commande est annulée (data = la commande).
- `stock` : le stock d'un produit change (data = le produit). Uniquement sur `/events`.

## Exigences

| Exigence | État |
|---|---|
| F1 à F10 | Faites |
| B1 : rattrapage avec `Last-Event-ID` | Fait |
| B2 : fin du flux quand la commande est livrée ou annulée | Fait |
| B3 : `retry: 5000` | Fait |
| B4 : commentaire `: ping` toutes les 20 s | Fait |
