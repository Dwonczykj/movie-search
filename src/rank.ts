import type { Movie } from "./csv.ts";

const K = 60;
const TOP = 50;

type Ranked = { index: number; score: number };

const rrf = ({ ranking, weight }: { ranking: Ranked[]; weight: number }): Ranked[] =>
  ranking.slice(0, TOP).map(({ index }, rank) => ({ index, score: weight / (K + rank + 1) }));

const sumByIndex = (entries: Ranked[]): Ranked[] =>
  Object.entries(Object.groupBy(entries, ({ index }) => index)).map(([index, group]) => ({
    index: Number(index),
    score: (group ?? []).reduce((sum, { score }) => sum + score, 0),
  }));

export const fuse = ({
  lexical,
  semantic,
  titleProbability,
  flaggedGenres,
  movies,
  limit,
}: {
  lexical: Ranked[];
  semantic: Ranked[];
  titleProbability: number;
  flaggedGenres: string[];
  movies: Movie[];
  limit: number;
}): Ranked[] => {
  const lexWeight = 0.25 + 0.75 * titleProbability;
  const semWeight = 1.25 - lexWeight;
  const boost = 1 + 0.5 * (1 - titleProbability);
  const fused = sumByIndex([...rrf({ ranking: lexical, weight: lexWeight }), ...rrf({ ranking: semantic, weight: semWeight })]);
  const flagged = new Set(flaggedGenres);
  return fused
    .map(({ index, score }) => {
      const hits = movies[index].genres.filter((g) => flagged.has(g)).length;
      return { index, score: score * boost ** hits };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

const cosineAt = ({ query, vectors, base, dim, queryMag }: { query: ArrayLike<number>; vectors: Float32Array; base: number; dim: number; queryMag: number }): number => {
  const acc = Array.from({ length: dim }).reduce(
    (a: { dot: number; mag: number }, _, d) => {
      const v = vectors[base + d];
      return { dot: a.dot + query[d] * v, mag: a.mag + v * v };
    },
    { dot: 0, mag: 0 },
  );
  const denom = queryMag * Math.sqrt(acc.mag);
  return denom === 0 ? 0 : acc.dot / denom;
};

export const cosineTop = ({
  query,
  vectors,
  dim,
  limit,
}: {
  query: ArrayLike<number>;
  vectors: Float32Array;
  dim: number;
  limit: number;
}): Ranked[] => {
  const count = Math.floor(vectors.length / dim);
  const queryMag = Math.sqrt(Array.from({ length: dim }).reduce((a: number, _, d) => a + query[d] * query[d], 0));
  return Array.from({ length: count }, (_, index) => ({
    index,
    score: cosineAt({ query, vectors, base: index * dim, dim, queryMag }),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
