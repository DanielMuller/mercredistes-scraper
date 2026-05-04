export default (data: unknown): unknown => {
  if (typeof data === "object") {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
  return data;
};
