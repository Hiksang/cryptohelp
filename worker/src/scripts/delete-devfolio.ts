import "dotenv/config";
import { supabase } from "../config/supabase.js";

async function main() {
  const { error, count } = await supabase
    .from("hackathons")
    .delete({ count: "exact" })
    .eq("source", "devfolio");

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log(`Deleted ${count} devfolio hackathons`);
  }
}

main().catch(console.error);
