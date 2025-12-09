import type { MatchResults } from "../types";

const vemptyArray: any[] = [];
const vemptyObject: any = {};

export const emptyArray = <T>(): T[] => {
  return vemptyArray as T[];
};

export const emptyObject = <T>(): T => {
  return vemptyObject as T;
};

export const emptyMatchResults = { matches: [], count: 0 } as MatchResults;