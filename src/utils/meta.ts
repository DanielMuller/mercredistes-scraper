interface StateData {
  diff: { added: string[] };
  newList: Record<
    string,
    { date: string; url: string; image?: string; srcImage?: string }
  >;
}

const imageMetaKeys = new Set([
  "og:image",
  "og:image:url",
  "twitter:image",
  "twitter:image:src",
  "image",
]);

export default (state: StateData): Promise<StateData> => {
  const getImageUrlPromises: Array<Promise<[string, string | null]>> = [];
  const dataList: Record<string, unknown> = {};
  state.diff.added.forEach((key) => {
    state.newList[key].image = setImagePath(state.newList[key]);
    dataList[key] = state.newList[key];
  });
  Object.keys(dataList).forEach((key) => {
    const item = state.newList[key];
    const getImageUrlPromise = getImageUrl(item.url).then((image) => {
      return [key, image] as [string, string | null];
    });
    getImageUrlPromises.push(getImageUrlPromise);
  });
  return Promise.all(getImageUrlPromises).then((results) => {
    results.forEach((item) => {
      const [key, image] = item;
      if (image) {
        state.newList[key].srcImage = image;
      }
    });
    return state;
  });
};

const setImagePath = (item: { date: string; url: string }): string => {
  const [year] = item.date.split("-");
  return (
    "images/" +
    year +
    "/" +
    item.url
      .replace(/^https?:\/\//i, "")
      .replace(/[^0-9a-z]/gi, "-")
      .replace(/-$/, "")
      .replace(/--+/g, "-") +
    ".jpg"
  );
};

const decodeHtmlEntities = (value: string): string => {
  if (!value || !value.includes("&")) {
    return value;
  }

  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    );
};

const parseAttributes = (tag: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  const attributePattern =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match = attributePattern.exec(tag);

  while (match) {
    const [, name, doubleQuoted, singleQuoted, bare] = match;
    const rawValue = doubleQuoted ?? singleQuoted ?? bare ?? "";
    attributes[name.toLowerCase()] = decodeHtmlEntities(rawValue);
    match = attributePattern.exec(tag);
  }

  return attributes;
};

const toAbsoluteUrl = (
  pageUrl: string,
  value: string | undefined,
): string | null => {
  if (!value || value.startsWith("data:") || value.startsWith("javascript:")) {
    return null;
  }

  try {
    return new URL(value, pageUrl).href;
  } catch {
    return null;
  }
};

const findMetaImage = (html: string, pageUrl: string): string | null => {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const attributes = parseAttributes(tag);
    const key = attributes.property || attributes.name || attributes.itemprop;
    if (!imageMetaKeys.has((key || "").toLowerCase())) {
      continue;
    }
    const imageUrl = toAbsoluteUrl(pageUrl, attributes.content);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
};

const findLinkImage = (html: string, pageUrl: string): string | null => {
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];

  for (const tag of linkTags) {
    const attributes = parseAttributes(tag);
    if ((attributes.rel || "").toLowerCase() !== "image_src") {
      continue;
    }
    const imageUrl = toAbsoluteUrl(pageUrl, attributes.href);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
};

const findImgFallback = (html: string, pageUrl: string): string | null => {
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];

  for (const tag of imgTags) {
    const attributes = parseAttributes(tag);
    const candidate =
      attributes["data-src"] || attributes["data-original"] || attributes.src;
    const imageUrl = toAbsoluteUrl(pageUrl, candidate);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
};

const extractImageUrl = (html: string, pageUrl: string): string | null => {
  return (
    findMetaImage(html, pageUrl) ||
    findLinkImage(html, pageUrl) ||
    findImgFallback(html, pageUrl)
  );
};

const getImageUrl = (pageUrl: string): Promise<string | null> => {
  return fetch(pageUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text().then((html) => {
        return extractImageUrl(html, response.url);
      });
    })
    .catch(() => null);
};
