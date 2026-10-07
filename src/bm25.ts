const K1 = 1.5;
const B = 0.75;

const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

const termFreqs = (text: string): Map<string, number> =>
  tokenize(text).reduce((m, term) => m.set(term, (m.get(term) ?? 0) + 1), new Map<string, number>());

export const makeBm25 = ({ docs }: { docs: string[] }) => {
  const tfs = docs.map(termFreqs);
  const lengths = tfs.map((m) => [...m.values()].reduce((a, c) => a + c, 0));
  const avgLength = lengths.reduce((a, c) => a + c, 0) / (docs.length || 1);
  const df = tfs.reduce(
    (acc, m) => [...m.keys()].reduce((a, term) => a.set(term, (a.get(term) ?? 0) + 1), acc),
    new Map<string, number>(),
  );
  const n = docs.length;

  const scoreDoc = ({ terms, i }: { terms: string[]; i: number }): number =>
    terms.reduce((sum, term) => {
      const f = tfs[i].get(term);
      if (!f) return sum;
      const dfTerm = df.get(term) ?? 0;
      const idf = Math.log(1 + (n - dfTerm + 0.5) / (dfTerm + 0.5));
      return sum + (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * lengths[i]) / avgLength));
    }, 0);

  return ({ query, limit }: { query: string; limit: number }): { index: number; score: number }[] => {
    const terms = [...new Set(tokenize(query))];
    return docs
      .map((_, i) => ({ index: i, score: scoreDoc({ terms, i }) }))
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };
};
