import type { Movie } from "./csv.ts";
import { fuse, cosineTop } from "./rank.ts";
import { DIM } from "./workers-ai.ts";
import type { askClef, embedTexts } from "./workers-ai.ts";

const TIMEOUT_MS = 2000;

export const search = async ({ query, index, ai }: {
  query: string;
  index: {
    movies: Movie[];
    vectors: Float32Array;
    genres: string[];
    bm25: (args: { query: string; limit: number }) => { index: number; score: number }[];
  };
  ai: { askClef: typeof askClef; embedTexts: typeof embedTexts } }):
  Promise<{ results: Movie[]; titleProbability: number; flaggedGenres: string[]; degraded: boolean }> => {
  const [clef, embed] = await Promise.all([
    ai.askClef({ query, genres: index.genres, timeoutMs: TIMEOUT_MS }),
    ai.embedTexts({ texts: [query], timeoutMs: TIMEOUT_MS }),
  ]);
  if (!clef.ok) console.warn(`clef failed, using neutral weights: ${clef.error}`);
  if (!embed.ok) console.warn(`embedding failed, bm25 only: ${embed.error}`);

  const titleProbability = clef.ok ? clef.titleProbability : 0.5;
  const flaggedGenres = clef.ok ? clef.flaggedGenres : [];
  const semantic = embed.ok ? cosineTop({ query: embed.vectors[0], vectors: index.vectors, dim: DIM, limit: 50 }) : [];
  const lexical = index.bm25({ query, limit: 50 });
  const ranked = fuse({ lexical, semantic, titleProbability, flaggedGenres, movies: index.movies, limit: 24 });

  return {
    results: ranked.map(({ index: i }) => index.movies[i]),
    titleProbability,
    flaggedGenres,
    degraded: !clef.ok || !embed.ok,
  };
};
