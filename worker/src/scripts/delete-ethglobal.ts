import "dotenv/config";
import { supabase } from "../config/supabase.js";

async function main() {
  const { error, count } = await supabase
    .from("hackathons")
    .delete({ count: "exact" })
    .eq("source", "ethglobal");

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log(`Deleted ${count} ethglobal hackathons`);
  }
}

main().catch(console.error);
