# Фронтенд `@checkout/web`

Next.js App Router, CSS Modules с именами БЭМ, свой HTTP-клиент.

Запуск из корня репозитория описан в [корневом README](../../README.md). Только фронт: `npm run dev:web`. Сборка: `npm run build -w @checkout/web`, `npm run start:web`.

## Слои

- `src/api/client.ts` — единственный `fetch`
- `src/api/resources/*` — пути и тела запросов
- `src/api/poll.ts` — опрос оплаты
- `src/session` — токен, заказ, идемпотентность, черновик формы
- `src/shop` — каталог и корзина
- `src/features` — экраны
- `app` — маршруты
