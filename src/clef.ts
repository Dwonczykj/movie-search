import { z } from "zod";

const FLAG_THRESHOLD = 0.7;

const genreKey = (genre: string): string => `genre_${genre.replace(/ /g, "_")}`;

const yesNo = (instructions: string) => ({ type: "noul", instructions });

export const clefQuestions = ({ genres }: { genres: string[] }): Record<string, { type: string; instructions: string }> => ({
  title: yesNo("Is the query a movie title, character name or actor, rather than a description of plot, theme or mood?"),
  ...Object.fromEntries(genres.map((genre) => [genreKey(genre), yesNo(`Is the user looking for ${genre} movies?`)])),
});

export const parseClef = ({ raw, genres }: { raw: unknown; genres: string[] }):
  | { ok: true; titleProbability: number; flaggedGenres: string[] }
  | { ok: false; error: string } => {
  const answer = z.object({ noul: z.number().min(0).max(1) });
  const entries: [string, typeof answer][] = [["title", answer], ...genres.map((genre): [string, typeof answer] => [genreKey(genre), answer])];
  const result = z.object({ answers: z.object(Object.fromEntries(entries)) }).safeParse(raw);
  if (!result.success) return { ok: false, error: result.error.message };
  const answers = result.data.answers;
  return {
    ok: true,
    titleProbability: answers.title.noul,
    flaggedGenres: genres.filter((genre) => answers[genreKey(genre)].noul > FLAG_THRESHOLD),
  };
};
