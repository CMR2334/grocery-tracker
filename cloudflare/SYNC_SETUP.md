# Grocery Tracker sync setup

These steps connect the app to a private Cloudflare R2 bucket through a Cloudflare Worker. You only need the Cloudflare dashboard and a web browser. The only Terminal command below is an optional way to generate a strong secret.

Keep the `SYNC_TOKEN` private. Anyone who has both the Worker URL and this token can read and change synced trips and screenshots.

## 1. Create the R2 bucket

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com/).
2. In the left sidebar, select **R2 Object Storage** (it may appear simply as **R2**).
3. On the R2 **Overview** page, select **Create bucket**.
4. For the bucket name, enter exactly `grocery-tracker`.
5. If Cloudflare asks for a location or storage class, leave the normal/default choice selected unless you have a specific reason to choose another one.
6. Select **Create bucket**.

The bucket is private by default. Do not turn on public access for the bucket; the Worker deliberately makes only the logo URL public.

## 2. Create and deploy the Worker

1. In the Cloudflare dashboard, open **Workers & Pages**.
2. Select **Create**.
3. Select **Worker**.
4. Give the Worker a short name, such as `grocery-tracker-sync`. The name becomes part of its `workers.dev` URL and must be available in your account.
5. Finish creating the Worker so that Cloudflare opens its code editor or Worker details page.
6. In this repository, open the file `cloudflare/worker.js`.
7. Copy the entire contents of that file.
8. In the Cloudflare Worker code editor, select all of the starter code, paste the copied code, and save it.
9. Select **Deploy** and wait for Cloudflare to confirm that the deployment completed.

## 3. Bind the R2 bucket to the Worker

1. Open the new Worker from **Workers & Pages**.
2. Select **Settings**.
3. Open **Bindings**.
4. Select **Add** (or **Add binding**) and choose **R2 bucket**.
5. Set **Variable name** to exactly `GT_BUCKET`.
6. Set **R2 bucket** to `grocery-tracker`.
7. Save the binding.
8. Deploy the Worker again if Cloudflare shows a **Deploy** button. A binding change does not affect the live Worker until it is deployed.

## 4. Add the sync secret

1. While viewing the Worker, select **Settings**.
2. Open **Variables and secrets**.
3. Select **Add**.
4. Choose the **Secret** type, not a plain-text variable.
5. Set the variable name to exactly `SYNC_TOKEN`.
6. Generate a long random value. On macOS, one simple option is to open **Terminal** and run:

   ```text
   openssl rand -hex 24
   ```

   Copy the resulting value. A password manager's random-password generator is also fine.

7. Paste the value into the secret field and save it.
8. Deploy the Worker again if Cloudflare asks you to deploy the variable change.

Do not paste the token into `worker.js`, `index.html`, a GitHub issue, or a public document. If you think it was exposed, replace the secret in this same **Variables and secrets** area and then update the app's Settings value.

## 5. Copy the Worker URL into the app

1. Open the Worker's **Overview** page.
2. Find the public `workers.dev` address. It will look like:

   ```text
   https://<worker-name>.<account>.workers.dev
   ```

3. Copy that URL without a trailing slash.
4. In the Grocery Tracker app, open **Settings** after the app-side sync task is complete.
5. Paste the Worker URL into the sync URL field and paste the same `SYNC_TOKEN` value into the sync token field.
6. Save the app settings.

## 6. Upload store logos

The logo URLs are public, but the R2 bucket itself should remain private.

1. In the Cloudflare dashboard, open **R2**.
2. Select the `grocery-tracker` bucket.
3. Select **Create folder** (or the equivalent folder action) and name the folder exactly `logos`.
4. Open the new `logos` folder and select **Upload**.
5. Upload square images with these exact canonical filenames:

   - `aldi.png`
   - `woodmans.png`
   - `picknsave.png`
   - `walmart.png`
   - `target.png`
   - `costco.png`
   - `instacart.png`

PNG files with transparency are preferred. Aim for about 256×256 pixels and use consistent padding so the logos look the same size in the app. If Cloudflare asks for a content type, use `image/png` for PNG files.

The list can be extended. The app lowercases a store name, removes every non-alphanumeric character, and then substring-matches its known aliases. For a new store, upload `<id>.png` using the normalized lowercase ID—for example, a store that normalizes to `newstore` should use `newstore.png`.

## 7. Verify the setup

First upload `aldi.png`, then open this address in a browser, replacing the placeholder with your Worker URL:

```text
https://<worker-url>/logos/aldi.png
```

The Aldi image should appear. This logo request is intentionally public and does not need the token.

To test the private trips endpoint, run this optional command in Terminal. Replace both placeholders; keep the token private:

```text
curl -i \
  -H "Authorization: Bearer <SYNC_TOKEN>" \
  "https://<worker-url>/trips"
```

Before any trips have been synced, the response should be HTTP 200 with:

```json
{"trips":[],"tombstones":[],"rev":0}
```

If the token is missing or wrong, `/trips` should return HTTP 401. If the logo URL returns 404, check that the file is inside the `logos` folder and that its filename is exactly `aldi.png` in lowercase.

## What this costs

For normal personal Grocery Tracker use, Cloudflare's R2 and Workers free tiers should comfortably cover the trip data, screenshots, logos, and ordinary sync requests. Cloudflare's billing dashboard is the source of truth if usage ever grows beyond the free allowances.
