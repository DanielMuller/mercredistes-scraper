import getSheet from "./sheets";

interface SheetItem {
  [key: string]: string;
}

interface CleanedItem {
  date: string;
  name: string;
  url: string;
  photographer?: string;
  [key: string]: unknown;
}

interface IndexedData {
  [url: string]: CleanedItem;
}

const fieldMap = ["date", "name", "url"];

const build = (year: number): Promise<IndexedData> => {
  const yearStr = year.toString();
  return (getSheet(year) as Promise<string[][]>)
    .then(removeInvalid)
    .then(toObject)
    .then((data) => cleanData(yearStr, data))
    .then(toIndex);
};

const toObject = (data: string[][]): SheetItem[] => {
  const objData: SheetItem[] = [];

  data.forEach((item) => {
    const objItem: SheetItem = {};
    fieldMap.forEach((value, key) => {
      objItem[value] = item[key]?.trim() ?? "";
    });
    objData.push(objItem);
  });

  return objData;
};

const toIndex = (data: CleanedItem[]): IndexedData => {
  const indexedData: IndexedData = {};
  data.forEach((item) => {
    indexedData[item.url] = item;
  });
  return indexedData;
};

const removeInvalid = (data: string[][] | null): string[][] => {
  if (!data) {
    return [];
  }
  const reduced: string[][] = [];
  const dateField = fieldMap.indexOf("date");
  const urlField = fieldMap.indexOf("url");
  if (dateField < 0 || urlField < 0) {
    return [];
  }
  data.forEach((item) => {
    let valid = true;
    if (item.length < fieldMap.length) {
      valid = false;
    }
    if (!isPlausibleDate(item[dateField])) {
      valid = false;
    }
    if (!isPlausibleUrl(item[urlField])) {
      valid = false;
    }
    if (valid) {
      reduced.push(item);
    }
  });
  return reduced;
};

const cleanData = (srcYear: string, data: SheetItem[]): CleanedItem[] => {
  const clean: CleanedItem[] = [];
  data.forEach((item) => {
    const [isoDate, deadwood] = cleanDate(item.date, srcYear);
    if (item.name === "" && deadwood) {
      item.name = deadwood;
    }
    const [name, photographer] = parseName(item.name);
    if (isoDate) {
      clean.push({
        date: isoDate,
        name,
        url: item.url,
        ...(photographer && { photographer }),
      });
    }
  });
  return clean;
};

const cleanDate = (
  date: string,
  srcYear: string,
): [string | false, string | null] => {
  let deadwood: string | null = null;
  const dateFixed = date.replaceAll(",", ".");
  const dateSeparator = getDateSeparator(dateFixed);

  const dateParse =
    dateSeparator === "."
      ? dateFixed.match(/^(\d+)(-\d+)?(\.\d+\.\d+)(.*)$/)
      : dateFixed.match(/^(\d+)(-\d+)?(\/\d+\/\d+)(.*)$/);

  if (!dateParse) {
    return [false, null];
  }

  let dateStr = `${dateParse[1]}${dateParse[3]}`;
  const [day, month, year] = dateStr.split(dateSeparator);
  if (dateParse[4]) {
    deadwood = dateParse[4];
  }
  try {
    const dayStr = ("00" + parseInt(day).toString()).slice(-2);
    const monthStr = ("00" + parseInt(month).toString()).slice(-2);
    let yearStr = ("20" + parseInt(year).toString()).slice(-4);
    if (parseInt(srcYear) < 2018) {
      if (srcYear !== yearStr) {
        if (Math.abs(parseInt(srcYear) - parseInt(yearStr)) >= 2) {
          yearStr = srcYear;
        } else {
          return [false, null];
        }
      }
    } else {
      yearStr = srcYear;
    }
    return [`${yearStr}-${monthStr}-${dayStr}`, deadwood];
  } catch (err) {
    console.error(`Error in parsing date: ${err}`);
    return [false, null];
  }
};

const isPlausibleDate = (string: string | undefined): boolean => {
  if (!string) {
    return false;
  }
  return /\d+[./,]\d+[./,]\d+/.test(string);
};

const getDateSeparator = (string: string): string => {
  if (/\d+\/\d+\/\d+/.test(string)) {
    return "/";
  }
  return ".";
};

const isPlausibleUrl = (string: string | undefined): boolean => {
  if (!string) {
    return false;
  }
  return /https?:\/\//.test(string);
};

const parseName = (string: string): [string, string | null] => {
  try {
    let name = cleanName(string.trim());
    let photographer: string | null = null;
    const matches = name.match(/^(.+)\((.+)\)$/);
    if (matches) {
      photographer = matches[2].trim();
      name = matches[1].trim();
    }
    if (photographer) {
      photographer = photographer.replace(/^photos?( de)? /i, "");
    }

    if (photographer && photographer.indexOf(",") > -1) {
      const tmp = photographer.split(",").map((item) => item.trim());
      photographer = tmp.pop() || null;
      name = `${name} (${tmp.join(", ")})`;
    }
    if (
      photographer &&
      (/^\d[\d-.]+$/.test(photographer) ||
        (/[\s]+/.test(photographer) &&
          (photographer.match(/[\s]+/g) || []).length > 3))
    ) {
      name = `${name} (${photographer})`;
      photographer = null;
    }
    if (photographer) {
      photographer = photographer.replace(/^\d+/, "").replace(/[()]/g, "");
    }
    if (photographer === null && process.env.default_photographer) {
      photographer = process.env.default_photographer;
    }
    return [name, photographer];
  } catch (err) {
    return [string, null];
  }
};

const cleanName = (string: string): string => {
  return string.replace(/\(\(+/g, "(").replace(/\)\)+/g, ")");
};

export default build;
