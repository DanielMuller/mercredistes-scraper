const key = process.env.GOOGLE_ACCESS_TOKEN;

interface SheetIds {
  [year: number]: string;
}

interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
}

const sheetIds: SheetIds = {
  2026: "1CICxqa8f7TrPSPXwbJVNyKj1viOZuGxpQtcRwytTbcw",
  2025: "1ceUh64shxqEOHKlKaOcjm7yPvj6H00HdZxquyyO8sDM",
  2024: "1rwTY9V89Gxt6AE9ad1Qomhs3PhHu-W_ydk-4MRrT8jM",
  2023: "1H72Bg4E8ol-sWiTEh2-epo6Mvv8V8kyqcc_-06blkX8",
  2022: "1tSIwJACXbk4wVAKaLb0ONX1coPZJNjjZa35uCAPYywE",
  2021: "1KYqKYq0lFbQug8tzrn6V76qLxWHM3bvBApf6r1mSEl4",
  2020: "1q0trQhxmnPRZ-fHo08Ytq-9-N-vl_FnIK10LIpyFJaI",
};

const fetchJson = async (url: string): Promise<Record<string, unknown>> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
};

const fetchSheetsJson = (
  sheetId: string,
  path: string,
): Promise<Record<string, unknown>> => {
  const url = new URL(
    path,
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/`,
  );
  url.searchParams.set("key", key!);
  return fetchJson(url.toString());
};

const fetchSheet = (year: number): Promise<string[][] | unknown> => {
  const sheetId = sheetIds[year];
  return getSpreadsheetInfo(sheetId)
    .then(getSheetInfo)
    .then((info) => getSheetData(sheetId, info));
};

const getSpreadsheetInfo = (
  sheetId: string,
): Promise<Record<string, unknown>> => {
  return fetchSheetsJson(sheetId, "") as Promise<Record<string, unknown>>;
};

const getSheetInfo = (data: Record<string, unknown>): SheetInfo => {
  const sheets = (data.sheets as Array<Record<string, unknown>>) || [];
  const filtered = sheets
    .filter(
      (item) => (item.properties as Record<string, unknown>).sheetId === 0,
    )
    .map((item) => {
      const props = item.properties as Record<string, unknown>;
      const grid = props.gridProperties as Record<string, unknown>;
      return {
        name: props.title as string,
        rowCount: grid.rowCount as number,
        columnCount: grid.columnCount as number,
      };
    });
  return filtered[0];
};

const getSheetData = (
  sheetId: string,
  info: SheetInfo,
): Promise<string[][]> => {
  return (
    fetchSheetsJson(sheetId, `values/${info.name}!A1:C250`) as Promise<{
      values: string[][];
    }>
  ).then((body) => body.values);
};

export default fetchSheet;
