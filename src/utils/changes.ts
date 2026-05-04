import * as fs from "fs";
import * as path from "path";
import debug from "./debug";
import meta from "./meta";
import * as git from "./git";
import { env } from "process";

interface Item {
  date: string;
  name: string;
  url: string;
  photographer?: string;
  image?: string;
  srcImage?: string;
}

interface ChangeState {
  diff: { added: string[] };
  newList: Record<string, Item>;
  [key: string]: unknown;
}

const doChanges = (state: ChangeState): Promise<unknown> => {
  const repoDir = git.clone();
  return Promise.resolve()
    .then(() => addItems(state))
    .then(() => removeItems(state))
    .then(() => doDownloads(state))
    .then(() => git.commit(`Update content from ${new Date().toISOString()}`))
    .then(() => git.push())
    .then(() => state)
    .catch((err) => {
      debug(err);
      return Promise.reject(err);
    });
};

const addItems = (state: ChangeState): Promise<void> => {
  return Promise.resolve()
    .then(() => meta(state as any))
    .then((updatedState) => {
      Object.assign(state, updatedState);
      return doDownloads(state);
    });
};

const removeItems = (state: ChangeState): void => {
  // Implementation to remove items if needed
  // This would typically delete image files
  if (state.diff && (state.diff as { removed?: string[] }).removed) {
    const removed = (state.diff as { removed?: string[] }).removed || [];
    removed.forEach((key) => {
      // Delete image file logic would go here
    });
  }
};

const doDownloads = (state: ChangeState): Promise<void> => {
  const downloadPromises: Array<Promise<unknown>> = [];
  const added = (state.diff as { added: string[] }).added || [];

  added.forEach((key) => {
    const item = state.newList[key];
    if (item.srcImage && item.image) {
      const downloadPromise = downloadImg(
        item.image,
        item.srcImage
      );
      downloadPromises.push(downloadPromise);
    }
  });

  return Promise.all(downloadPromises).then(() => {
    return;
  });
};

const downloadImg = (filepath: string, url: string): Promise<void> => {
  const repoPath = path.join("/tmp", env.GITHUB_REPO || "");
  const fullPath = path.join(repoPath, filepath);
  const dir = path.dirname(fullPath);

  return Promise.resolve()
    .then(() => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    })
    .then(() => {
      return fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      });
    })
    .then((buffer) => {
      fs.writeFileSync(fullPath, Buffer.from(buffer));
    });
};

export default doChanges;
