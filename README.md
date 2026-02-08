# [throne-board.cc](https://throne-board.cc)

Throne has a little leaderboard section, but it's very limited. It only shows the top 3 over any given time, ignoring anyone else. Fortunately they have an endpoint that's **very** open, so you can build a leaderboard yourself.

throne-board.cc gives the API endpoint a slightly better frontend.

## Technologies used
- React 19
- TypeScript
- Vite
- Tailwind CSS
- TanStack React Query

## What I've learned
- Building around existing firebase apps
- Transforming data from API endpoints
- firebase / firestore queries

## What can be improved
While an improvement on the existing UX, it can still be improved
- Tabs instead of long lists
- Remember searched creators
- Improved design

## How to run?
Install dependencies and start the development server.
- `pnpm install`
- `pnpm dev`

For a production build:
- `pnpm build`
- `pnpm preview`
