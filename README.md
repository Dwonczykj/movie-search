# movie-search

A movie search box that understands both titles and descriptions. Type "toy story" and you get the Toy Story films. Type "scary haunted house" or "something to make me cry" and you get films that match the idea, not just the words.

About 9,800 movies, searched in memory by one small Node server. No database and no cloud function.

## What powers the search

| Piece | What it does | Where |
| --- | --- | --- |
| [BM25](https://en.wikipedia.org/wiki/Okapi_BM25) | Classic keyword search. Great for exact titles and names. | `src/bm25.ts` |
| [`@cf/baai/bge-small-en-v1.5`](https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/) on Cloudflare Workers AI | Turns each movie and each query into 384 numbers, so "scary" can match "horror". Cheap and fast. | `src/workers-ai.ts`, `src/rank.ts` |
| [Clef-flash](https://blog.cloudflare.com/clef-decision-models/) (`@cf/cloudflare/clef-flash`) on Cloudflare Workers AI | A decision model. It reads the query and answers yes/no questions with a probability: "is this a title?" and, for each of the 19 genres, "is the user asking for this genre?". | `src/clef.ts` |
| Weighted reciprocal-rank fusion | Merges the keyword list and the meaning list into one ranking. | `src/rank.ts` |
| [Zod](https://zod.dev) | Checks every response from Cloudflare before the code trusts it. The only dependency. | `src/clef.ts`, `src/workers-ai.ts` |
| TMDB data from [Pablinho/movies-dataset](https://huggingface.co/datasets/Pablinho/movies-dataset) | The movies, with overviews and poster links. | `build-index.ts` |

### How one search works

1. The page waits 300ms after you stop typing, cancels any request still in flight, then calls `GET /api/search?q=...`.
2. The server runs two Cloudflare calls at the same time: one embedding for the query, and one Clef call with the title question plus the 19 genre questions.
3. BM25 ranks the movies by keywords. The embedding ranks them by meaning (cosine similarity).
4. Clef's title probability sets the balance. A title-like query leans on keywords (weight 0.25 + 0.75 x p). A descriptive query leans on meaning.
5. Each genre Clef is more than 70% sure about boosts matching movies. The boost fades as the query looks more like a title, so typing an exact title keeps that film first.
6. The top 24 come back with the title probability, the flagged genres and the time taken.

If Clef or the embedding call fails or takes longer than 2 seconds, search still works. It falls back to even weights or keywords only, and the response and the page say `degraded`.

## Run it yourself

You need Node 22.18 or newer (it runs the `.ts` files directly, no build step) and a free Cloudflare account.

1. Create a Cloudflare API token with the **Workers AI: Read** permission, and note your account ID. Both are in the [Cloudflare dashboard](https://dash.cloudflare.com).
2. Install and add your keys:

   ```bash
   git clone https://github.com/Dwonczykj/movie-search.git
   cd movie-search
   npm install
   cp .env.example .env
   ```

   Then put your account ID and token in `.env`.

3. Build the index. This downloads the dataset and embeds every movie (about 100 Cloudflare calls, around 30 seconds). It writes `data/movies.json` and `data/vectors.bin`.

   ```bash
   npm run index
   ```

4. Start the server and open http://127.0.0.1:3000.

   ```bash
   npm start
   ```

5. Run the tests (no network or keys needed).

   ```bash
   npm test
   ```

The server only listens on `127.0.0.1`. Every search spends a little of your Cloudflare Workers AI allowance, so do not expose it to the internet as it is.

## Layout

```
build-index.ts        download, embed, write data/
server.ts             HTTP server: /api/search and the page
public/index.html     search box, 300ms debounce, result grid
src/csv.ts            CSV parser, drops malformed rows
src/bm25.ts           keyword ranking
src/rank.ts           cosine similarity and rank fusion
src/clef.ts           Clef questions and response check
src/workers-ai.ts     the only code that talks to Cloudflare
src/search.ts         puts it together, handles failures
test/                 node --test
```

## Credits

Movie data and posters come from [TMDB](https://www.themoviedb.org) through the Pablinho dataset on Hugging Face. This project is not endorsed or certified by TMDB.
