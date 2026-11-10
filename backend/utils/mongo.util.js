// Funzione di utilità per riconoscere gli errori di chiave duplicata di MongoDB.
function isDuplicateKeyError(err) {
  return err && err.code === 11000;
}

module.exports = { isDuplicateKeyError };
