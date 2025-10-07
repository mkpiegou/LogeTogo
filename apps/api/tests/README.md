# Tests LogeTogo API

Ce répertoire contient les tests automatisés pour l'API LogeTogo.

## 🚀 Exécuter les tests

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch
npm run test:watch

# Exécuter les tests avec couverture
npm run test:coverage
```

## 🗄️ Configuration de la base de données

Les tests utilisent **SQLite** pour faciliter l'exécution en CI/CD et en développement local.

### Fichier `.env` pour les tests
```env
DATABASE_URL="file:./test.db"
NODE_ENV=development
```

### En production
En production, LogeTogo utilise **PostgreSQL**. Pour utiliser PostgreSQL en développement:

1. Mettre à jour `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Mettre à jour le `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/logetogo_dev"
```

3. Regénérer le client Prisma:
```bash
npx prisma generate
npx prisma db push
```

## 📋 Structure des tests

- `routes.test.ts` - Tests des routes API (système, test endpoints, etc.)

## ✅ Couverture actuelle

- 9 tests passants
- Routes système (health, info)
- Routes de test (database, users, properties, cleanup)
- Gestion des erreurs (404, validation)
