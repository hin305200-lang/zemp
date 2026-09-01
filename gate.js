(function () {
  "use strict";

  var STAFF_EMAIL = ["5edfa2692bdacc5e6ee805c626c50cb44cebb065f092d9a1067d89f74dacd326"];
  var STAFF_PASS = ["270baedc320ae2d1864177af4a647ec1da71d3df577894028102bf91abc13c25"];
  var DEMO_EMAIL = [
    "f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a",
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  ];
  var DEMO_PASS = [
    "ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae",
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  ];

  function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  function digest(text) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.resolve("");
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(toHex);
  }

  function has(list, value) {
    return list.indexOf(value) >= 0;
  }

  function classify(email, password) {
    var e = (email || "").trim().toLowerCase();
    var p = (password || "").trim();
    return Promise.all([digest(e), digest(p)]).then(function (parts) {
      return {
        staff: has(STAFF_EMAIL, parts[0]) && has(STAFF_PASS, parts[1]),
        demo: has(DEMO_EMAIL, parts[0]) && has(DEMO_PASS, parts[1])
      };
    });
  }

  window.NNGate = { classify: classify };
})();
