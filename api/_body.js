// Vercel bazı çalıştırma ortamlarında req.body'yi hazır vermiyor —
// o durumda gövdeyi akıştan elle okuyoruz.
module.exports = function readBody(req) {
  return new Promise(function (resolve) {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    if (typeof req.body === "string") {
      try { return resolve(JSON.parse(req.body || "{}")); } catch (e) { return resolve({}); }
    }
    var raw = "";
    req.on("data", function (d) { raw += d; });
    req.on("end", function () {
      try { resolve(JSON.parse(raw || "{}")); } catch (e) { resolve({}); }
    });
    req.on("error", function () { resolve({}); });
  });
};
