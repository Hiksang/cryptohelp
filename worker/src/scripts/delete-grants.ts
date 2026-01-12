import "dotenv/config";
import { supabase } from "../config/supabase.js";

async function main() {
  const { error, count } = await supabase
    .from("grants")
    .delete({ count: "exact" })
    .eq("source", "foundation_grants");

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log(`Deleted ${count} foundation grants`);
  }
}

main().catch(console.error);
