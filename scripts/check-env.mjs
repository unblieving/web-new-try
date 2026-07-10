const requiredNodeMajor = 24;
const currentNodeMajor = Number(process.versions.node.split(".")[0]);

if (currentNodeMajor < requiredNodeMajor) {
  console.error(
    `Node.js ${requiredNodeMajor}+ is required; current version is ${process.versions.node}.`,
  );
  process.exit(1);
}

console.log(`Node.js ${process.versions.node} is ready.`);
console.log("Run `npm install` and then `npm run dev` to start the project.");
