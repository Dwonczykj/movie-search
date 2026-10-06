// Hybrid search: BM25 + embeddings, merged with weighted RRF.
// Clef (typed decision model) reads the query and returns probabilities that set the weights.
import { ai, embed, DIM } from "./lib.mjs";

export const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", "Romance", "Science Fiction", "Thriller", "War", "Western"];

const QUESTIONS = {
  title: { type: "noul", instructions: "Is the query (part of) a movie title, name or actor, rather than a description of plot, theme or mood?" },
  genre: {
    type: "choice",
    instructions: "Which single genre is the user clearly asking for? Use none if no genre is implied.",
    criteria: { none: "No specific genre", ...Object.fromEntries(GENRES.map((g) => [g, g])) },
  },
};

export async function decide(q) {
  try {
    const { answers } = await ai("@cf/cloudflare/clef-flash", { model: "clef-flash", state: q, questions: QUESTIONS });
    const g = answers.genre;
    return { title: answers.title.noul, genre: g.confidence > 0.7 && g.choice !== "none" ? g.choice : null };
  } catch (e) {
    console.warn("clef failed, using neutral weights:", e.message);
    return { title: 0.5, genre: null };
  }
}

export function makeSearch({ movies, vecs, bm25 }) {
  const dot = (qv, i) => { let s = 0; for (let d = 0; d < DIM; d++) s += qv[d] * vecs[i * DIM + d]; return s; };
  // Clef + embedding run in parallel; either failing degrades to BM25-only / neutral.
  return async function search(q, k = 24) {
    const [decision, qv] = await Promise.all([decide(q), embed([q]).then((r) => r[0]).catch(() => null)]);
    const lex = bm25(q);
    const sem = qv
      ? movies.map((_, i) => ({ i, score: dot(qv, i) })).sort((a, b) => b.score - a.score).slice(0, 50)
      : [];
    const wLex = 0.25 + 0.75 * decision.title; // title-like queries lean on BM25
    const wSem = 1.25 - wLex;
    const score = new Map();
    const add = (list, w) => list.forEach(({ i }, rank) => score.set(i, (score.get(i) ?? 0) + w / (60 + rank)));
    add(lex, wLex);
    add(sem, wSem);
    const hits = [...score].map(([i, s]) => ({
      ...movies[i],
      score: decision.genre && movies[i].genres.includes(decision.genre) ? s * 1.5 : s,
    }));
    hits.sort((a, b) => b.score - a.score);
    return { decision, results: hits.slice(0, k) };
  };
}
