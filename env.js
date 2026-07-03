name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: shamba
          POSTGRES_PASSWORD: shamba_password
          POSTGRES_DB: shamba_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    defaults:
      run:
        working-directory: backend
    env:
      DATABASE_URL: postgresql://shamba:shamba_password@localhost:5432/shamba_test
      JWT_SECRET: ci-test-secret
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run lint
      - run: npm test

  frontend-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run build

  deploy:
    needs: [backend-test, frontend-build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Deploy step: trigger platform deploy hooks (Render/Railway/Fly.io) or
      # `docker build && docker push` to your registry then roll the service.
      # Kept as a placeholder — wire up the actual deploy target's CLI/API here.
      - name: Trigger deployment
        run: echo "Add deploy hook here (Render/Fly.io/Railway/ECS) using secrets.DEPLOY_HOOK_URL"
