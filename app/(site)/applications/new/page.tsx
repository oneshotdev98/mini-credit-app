import { listCustomFieldDefinitions } from "@/lib/custom-field-definitions";
import NewApplicationWizard from "./NewApplicationWizard";

export const dynamic = "force-dynamic";

export default async function NewApplicationPage() {
  const initialDefinitions = await listCustomFieldDefinitions();
  return <NewApplicationWizard initialDefinitions={initialDefinitions} />;
}
