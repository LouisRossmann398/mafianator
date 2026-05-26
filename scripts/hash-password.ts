import bcrypt from "bcryptjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: npm run seed:hash -- <password> [<password2> ...]");
  process.exit(1);
}

for (const password of args) {
  const hash = bcrypt.hashSync(password, 12);
  console.log(`${password}  ->  ${hash}`);
}
