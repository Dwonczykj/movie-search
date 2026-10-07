const K1 = 1.5;
const B = 0.75;

const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

const countBy = (items: string[]): Map<string, number> =>
  new Map(Object.entries(Object.groupBy(items, (item) => item)).map(([key, group]) => [key, group?.length ?? 0]));

export const makeBm25 = ({ docs }: { docs: string[] }) => {
  const tfs = docs.map((doc) => countBy(tokenize(doc)));
  const lengths = tfs.map((m) => [...m.values()].reduce((a, c) => a + c, 0));
  const avgLength = lengths.reduce((a, c) => a + c, 0) / (docs.length || 1);
  const df = countBy(tfs.flatMap((m) => [...m.keys()]));
  const n = docs.length;

  const scoreTerm = ({ term, i }: { term: string; i: number }): number => {
    const f = tfs[i].get(term) ?? 0;
    const dfTerm = df.get(term) ?? 0;
    const idf = Math.log(1 + (n - dfTerm + 0.5) / (dfTerm + 0.5));
    return (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * lengths[i]) / avgLength));
  };

  return ({ query, limit }: { query: string; limit: number }): { index: number; score: number }[] => {
    const terms = [...new Set(tokenize(query))];
    return docs
      .map((_, i) => ({ index: i, score: terms.reduce((sum, term) => sum + scoreTerm({ term, i }), 0) }))
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };
};
