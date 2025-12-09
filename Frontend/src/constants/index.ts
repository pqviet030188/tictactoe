import type { MatchResults } from "../types";

const vemptyArray: null[] = [];
const vemptyObject: null = null;

export const emptyArray = <T>(): T[] => {
  return vemptyArray as T[];
};

export const emptyObject = <T>(): T => {
  return vemptyObject as T;
};

export const emptyMatchResults = { matches: [], count: 0 } as MatchResults;