# movie-search

Hybrid movie search: BM25 plus Workers AI embeddings, fused with weighted reciprocal-rank fusion. A Clef-flash call reads each query and sets the lexical/semantic weight and a per-genre boost.

## Setup

Copy `.env.example` to `.env` and fill in both values. The `CLOUDFLARE_API_TOKEN` needs the Workers AI Read permission.

## Run

```
npm install
npm run index   # downloads the dataset, embeds it, writes data/
npm run start    # serves http://127.0.0.1:3000
npm test
```

The code is TypeScript run directly by Node's type stripping, with `zod` as the only dependency.
