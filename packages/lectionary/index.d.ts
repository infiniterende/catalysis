/** The citation for each reading of one day's Mass. */
export interface LectionaryEntry {
  first?: string;
  psalm?: string;
  second?: string;
  gospel: string;
}

/** The first and last days with readings, as `YYYY-MM-DD`. */
export declare const LECTIONARY_RANGE: { first: string; last: string };

export declare function loadLectionaryDay(date: string): Promise<LectionaryEntry | undefined>;
