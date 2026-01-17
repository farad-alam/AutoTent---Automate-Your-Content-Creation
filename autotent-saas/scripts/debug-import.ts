
try {
    const pkg = require("@portabletext/markdown");
    console.log("Exports:", Object.keys(pkg));
} catch (e) {
    console.error("Require failed:", e);
}
