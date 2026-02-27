# CHECKLIST (Перед `git push`)

Этот файл нужен, чтобы не ломать рабочую версию сайта случайным обновлением.

## Когда использовать

Каждый раз перед:

- `git push`
- `Redeploy` в Vercel (если менял код)

## Быстрый вариант (3 шага)

```bash
npm run prepush:check
git status
git add -u && git commit -m "Что изменил" && git push
```

## Что делает `npm run prepush:check`

Запускает:

```bash
npm run build
```

Это проверка “как на Vercel”:

- сборка Next.js
- проверка TypeScript
- ошибки, которые могли не проявиться в `npm run dev`

Если `build` падает:

- не делай `git push`
- исправь ошибку
- повтори `npm run prepush:check`

## Что смотреть в `git status`

### Нормально

- `modified:` файлы, которые ты реально менял
- `untracked: .env` (секреты остаются только локально)

### Нежелательно

- `.env` в staged changes (готовится к коммиту)
- `.DS_Store`
- случайные временные файлы

## Если случайно добавил `.env`

Убрать из staged (не удаляя файл):

```bash
git restore --staged .env
```

## Если случайно добавил `.DS_Store`

Удали файл:

```bash
rm app/decks/.DS_Store
```

## Полный безопасный ритуал (рекомендуется)

```bash
git status
npm run prepush:check
git status
git add -u
git commit -m "Коротко: что изменил"
git push
```

## Когда запускать `npm run prisma:push`

Только если менял `prisma/schema.prisma` (модель базы данных).

```bash
npm run prisma:push
```

После этого снова проверь:

```bash
npm run prepush:check
```

