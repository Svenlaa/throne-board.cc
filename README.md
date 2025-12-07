# [throne-board.cc](https://throne-board.cc)

## What is it?

Throne has a little leaderboard section, but it's very limited. It only shows the top 3 over any given time, ignoring anyone else. Fortunately they have an endpoint that's **very** open, so you can build a leaderboard yourself.

throne-board.cc gives the API endpoint a slightly better frontend.

## Technologies used
- HTML
- Javascript

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
It's a static page. You can open index.html in your browser and it `just works`.

You can also use a server.
- `npm i -g serve`
- `serve -p 3000`
