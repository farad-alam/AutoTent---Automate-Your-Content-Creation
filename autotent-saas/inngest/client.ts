import { Inngest } from "inngest";

// Handle the case where the variable is undefined during build time or simple checks
const appId = process.env.NEXT_PUBLIC_INNGEST_APP_ID || "autotent-saas";

export const inngest = new Inngest({ id: appId });
