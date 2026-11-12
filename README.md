# Deyvon Tech website

A responsive company website and small Node.js inquiry backend. The site uses the supplied Deyvon Tech brand images and company profile.

## Run locally

Install Node.js 20 or newer, then run:

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set the `PORT` environment variable to use another port. Node.js 20 or newer is required by the email dependency.

## Deploy on Render with `deyvon.in`

The included `render.yaml` is a Render Blueprint for the Node.js website. It configures the app, a `/health` endpoint, Gmail SMTP environment variables, and a persistent disk for inquiry records. **A persistent disk requires a paid Render service and may incur ongoing charges. Check Render's current plan and disk prices before creating the service.**

1. Create a GitHub account if you do not already have one, create a **private** repository, and upload the website project. Do not upload `.env`, passwords, or other credentials. Git ignores `.env`, `node_modules`, and inquiry data.
2. Create a Render account and connect the private GitHub repository. In Render, select **New → Blueprint**, select your repository, and review the service and persistent disk. Confirm the price before approving any paid resource.
3. During Blueprint setup, provide the `SMTP_PASS` secret. For Gmail, create a Google App Password using the account's 2-Step Verification. Use the sending account's App Password, not your normal Gmail password. Render supplies the `PORT` variable automatically.
4. Wait for the first deployment and confirm the Render health check succeeds. Render assigns a temporary `*.onrender.com` address. Submit a real test inquiry and confirm `deyvontech@gmail.com` receives it before routing your custom domain.
5. In the Render service's **Settings → Custom Domains**, add `deyvon.in` and `www.deyvon.in`. Render will display the DNS records to create for your service.
6. In GoDaddy's **DNS Management** for `deyvon.in`, add or update only the website records (`@` and `www`) to match the exact values Render displays. Remove conflicting records for those same website hosts if needed. **Do not remove or change MX, SPF, DKIM, DMARC, or other email DNS records**; those can affect company email.
7. Wait for DNS to propagate, then confirm both hostnames work over HTTPS and the Render dashboard shows the domain as verified.

The site source and `render.yaml` must be committed to the connected GitHub repository for Render to deploy it. You must sign in to your own GitHub, Render, and GoDaddy accounts and approve any charges. Never share passwords, App Passwords, or other secret values in chat.

## Email notifications for contact inquiries

Each valid contact form inquiry is saved as a JSON line in `data/inquiries.jsonl` and emailed to `deyvontech@gmail.com`. The inquiry email includes the sender's details and project message; replying to it replies directly to the sender. The data folder is outside the public file allowlist. Keep the folder private and make sure the deployment environment has persistent, protected storage. Set `INQUIRY_FILE` in `.env` or the hosting environment to select another private, persistent path.

### Configure Gmail SMTP

1. Enable 2-Step Verification for the Gmail account that will send website inquiries.
2. Create a Google App Password for the website. Use this password, **not** your regular Google password.
3. Copy `.env.example` to `.env` in the project folder.
4. Set `SMTP_USER` to the sending Gmail address and `SMTP_PASS` to its App Password (without spaces). By default, notifications go to `deyvontech@gmail.com`; set `EMAIL_TO` to another address if needed.
5. Run `npm start` and submit a test inquiry to confirm that the email arrives.

Keep `.env` private; it is ignored by Git. Never put SMTP credentials in website files or share them publicly. Restart the server after changing `.env`.

If SMTP is not configured, a valid inquiry is still saved locally, but the form reports that the email notification was not sent. If the mail provider rejects delivery, the form reports the delivery error and the saved inquiry is retained. The website email and phone links remain available as an alternative contact method. Hosted deployments must configure the same SMTP variables in the hosting provider's secret/environment settings.
