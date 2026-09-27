import lint from "../src/index.js";
import parse from "./nlp.js";

const [, , text] = process.argv;
if (text == null) {
  console.error('Usage: npm run start "Your awesome text"');
  process.exit(1);
}

console.log(JSON.stringify(lint(parse(text)), null, 2));
