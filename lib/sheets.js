// Example api request:
// GET "https://sheets.googleapis.com/v4/spreadsheets/15Jt5Bqr5bznd6Rsn0nN-Pnz7bzDzIeWDTDG_hfNo6cU/values/Sheet1\!A1:D5?key=AIzaSyBA0jyKBahYuyyFhA0_zcDMhw7Td4p88yk"

const key = process.env.GOOGLE_ACCESS_TOKEN;
// const debug = require('./debug')

const sheetIds = {
  2026: "1CICxqa8f7TrPSPXwbJVNyKj1viOZuGxpQtcRwytTbcw",
  2025: "1ceUh64shxqEOHKlKaOcjm7yPvj6H00HdZxquyyO8sDM",
  2024: "1rwTY9V89Gxt6AE9ad1Qomhs3PhHu-W_ydk-4MRrT8jM",
  2023: "1H72Bg4E8ol-sWiTEh2-epo6Mvv8V8kyqcc_-06blkX8",
  2022: "1tSIwJACXbk4wVAKaLb0ONX1coPZJNjjZa35uCAPYywE",
  2021: "1KYqKYq0lFbQug8tzrn6V76qLxWHM3bvBApf6r1mSEl4",
  2020: "1q0trQhxmnPRZ-fHo08Ytq-9-N-vl_FnIK10LIpyFJaI",
  // 2019: '15Jt5Bqr5bznd6Rsn0nN-Pnz7bzDzIeWDTDG_hfNo6cU',
  // 2018: '1PY4IYH-uzeclSAoAYIByMa0zFVYoQqkuItrbqAfTg_k',
  // 2017: '1PQCcmD-afW48LxRFa6RDBDyzH0iauA80XNzO3LenAtA',
  // 2016: '1PQCcmD-afW48LxRFa6RDBDyzH0iauA80XNzO3LenAtA'
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};

const fetchSheetsJson = (sheetId, path) => {
  const url = new URL(
    path,
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/`,
  );
  url.searchParams.set("key", key);
  return fetchJson(url);
};

const fetchSheet = (year) => {
  const sheetId = sheetIds[year];
  return getSpreadsheetInfo(sheetId)
    .then(getSheetInfo)
    .then((info) => getSheetData(sheetId, info));
};

const getSpreadsheetInfo = (sheetId) => {
  return fetchSheetsJson(sheetId, "");
};

const getSheetInfo = (data) => {
  return data.sheets
    .filter((item) => item.properties.sheetId === 0)
    .map((item) => {
      return {
        name: item.properties.title,
        rowCount: item.properties.gridProperties.rowCount,
        columnCount: item.properties.gridProperties.columnCount,
      };
    })[0];
};

const getSheetData = (sheetId, info) => {
  return fetchSheetsJson(sheetId, `values/${info.name}!A1:C250`).then(
    (body) => body.values,
  );
};

export default fetchSheet;
