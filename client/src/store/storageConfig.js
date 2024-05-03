import localforage from 'localforage';

localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'qrev-storage',
  storeName: '__keys_and_values__',
  version: 1.0,
  description: 'Replacement for localStorage. Forces to use IndexedDB driver',
});

export default localforage;
