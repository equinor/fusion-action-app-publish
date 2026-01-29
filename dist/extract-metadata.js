const loadMetadata = (bundle) => {
  const metadataEntry = bundle.getEntry("metadata.json") ?? bundle.getEntries().find((entry) => entry.entryName.endsWith("/metadata.json"));
  if (!metadataEntry) {
    throw new Error("Metadata file not found in bundle");
  }
  return new Promise((resolve, reject) => {
    metadataEntry.getDataAsync((data, err) => {
      if (err) {
        return reject(new Error("Failed to read metadata file", { cause: err }));
      }
      try {
        console.log(JSON.parse(String(data)));
        return resolve(JSON.parse(String(data)));
      } catch (error) {
        reject(new Error("Failed to parse metadata file", { cause: error }));
      }
    });
  });
};
export {
  loadMetadata
};
//# sourceMappingURL=extract-metadata.js.map
