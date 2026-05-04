import { EventBridgeEvent } from "aws-lambda";
import listing from "../utils/listing";
import { diffArrays } from "diff";
import doChanges from "../utils/changes";
import debug from "../utils/debug";

interface Item {
  date: string;
  name: string;
  url: string;
  photographer?: string;
  image?: string;
  srcImage?: string;
}

interface AddContentState {
  year: string;
  newList: Record<string, Item>;
  diff: {
    added: string[];
    removed?: string[];
  };
  [key: string]: unknown;
}

export const handler = async (
  event: EventBridgeEvent<string, unknown>,
): Promise<void> => {
  const year = extractYear(event);

  try {
    const state: AddContentState = {
      year,
      newList: {},
      diff: { added: [] },
    };

    const previousList = await fetchPreviousList(year);
    const newList = await listing(parseInt(year));

    state.newList = newList;
    state.diff = diffVersions({
      ...state,
      previousList,
    });

    debug(state);
    await doChanges(state);
  } catch (err) {
    debug(err);
    throw err;
  }
};

const extractYear = (event: EventBridgeEvent<string, unknown>): string => {
  const now = new Date();
  return now.getFullYear().toString();
};

const fetchPreviousList = (year: string): Promise<Record<string, unknown>> => {
  const url = `https://raw.githubusercontent.com/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/master/data/${year}.json`;

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        return {};
      }
      return response.json() as Promise<Record<string, unknown>>;
    })
    .catch(() => {
      return {};
    });
};

interface DiffState {
  previousList: Record<string, unknown>;
  newList: Record<string, unknown>;
  [key: string]: unknown;
}

const diffVersions = (
  state: DiffState,
): { added: string[]; removed: string[] } => {
  const previousKeys = Object.keys(state.previousList || {});
  const newKeys = Object.keys(state.newList);

  const changes = diffArrays(previousKeys, newKeys);

  const added: string[] = [];
  const removed: string[] = [];

  changes.forEach((change) => {
    if (change.added) {
      added.push(...change.value);
    } else if (change.removed) {
      removed.push(...change.value);
    }
  });

  return { added, removed };
};
