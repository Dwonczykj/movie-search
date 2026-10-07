export type Movie = {
  title: string;
  year: string;
  overview: string;
  genres: string[];
  rating: number;
  poster: string;
};

type CsvState = { rows: string[][]; row: string[]; field: string; quoted: boolean; skip: boolean };

const endRow = (state: CsvState): CsvState => ({
  rows: [...state.rows, [...state.row, state.field]],
  row: [],
  field: "",
  quoted: false,
  skip: false,
});

const step = ({ state, char, next }: { state: CsvState; char: string; next: string }): CsvState => {
  if (state.skip) return { ...state, skip: false };
  if (state.quoted && char === '"' && next === '"') return { ...state, field: state.field + '"', skip: true };
  if (state.quoted && char === '"') return { ...state, quoted: false };
  if (state.quoted) return { ...state, field: state.field + char };
  if (char === '"') return { ...state, quoted: true };
  if (char === ",") return { ...state, row: [...state.row, state.field], field: "" };
  if (char === "\n") return endRow(state);
  if (char === "\r" && next === "\n") return state;
  if (char === "\r") return endRow(state);
  return { ...state, field: state.field + char };
};

export const parseCsv = ({ text }: { text: string }): string[][] => {
  const chars = [...text];
  const seed: CsvState = { rows: [], row: [], field: "", quoted: false, skip: false };
  const state = chars.reduce((state, char, i) => step({ state, char, next: chars[i + 1] ?? "" }), seed);
  if (!state.field && !state.row.length) return state.rows;
  return [...state.rows, [...state.row, state.field]];
};

export const toMovies = ({ rows }: { rows: string[][] }): Movie[] => {
  const [header, ...body] = rows;
  if (!header) return [];
  const col = Object.fromEntries(header.map((name, i): [string, number] => [name, i]));
  return body
    .filter((row) => row.length === header.length && row[col.Title] && row[col.Overview])
    .map((row) => ({
      title: row[col.Title],
      year: (row[col.Release_Date] ?? "").slice(0, 4),
      overview: row[col.Overview],
      genres: (row[col.Genre] ?? "").split(",").map((g) => g.trim()).filter(Boolean),
      rating: Number(row[col.Vote_Average]),
      poster: row[col.Poster_Url] ?? "",
    }));
};
