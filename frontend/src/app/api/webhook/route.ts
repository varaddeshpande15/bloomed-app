import { Webhook } from "svix";
import { headers } from "next/headers";
import { UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { upsertAppUser } from "@/actions/sync-user";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("WEBHOOK_SECRET is not set");
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_signature = headerPayload.get("svix-signature");
  const svix_timestamp = headerPayload.get("svix-timestamp");

  // If there are no headers, error out.

  if (!svix_id || !svix_signature || !svix_timestamp) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body.
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new SVIX instance with the secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers.

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get user details.
  const { id, first_name, last_name, email_addresses, image_url } =
    evt.data as UserJSON;

  try {
    const email =
      email_addresses[0]?.email_address ?? `${id}@users.clerk.local`;
    const name =
      [first_name, last_name].filter(Boolean).join(" ").trim() || "User";

    await upsertAppUser({
      id,
      name,
      email,
      imageUrl: image_url,
    });

    return new Response("User upserted", { status: 201 });
  } catch (err) {
    console.log("Error upserting user: ", err);
    return new Response("Error occured", {
      status: 500,
    });
  }
}
