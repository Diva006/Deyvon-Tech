# Deyvon Tech website

A responsive company website with a Node.js local development server and Netlify Forms for production inquiries. The site uses the supplied Deyvon Tech brand images and company profile.

## Run locally

Install Node.js 20 or newer, then run:

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set the `PORT` environment variable to use another port. Node.js 20 or newer is required by the local development server.

## Deploy on Netlify with `deyvon.in`

The site is configured as a static Netlify deployment. `netlify.toml` publishes only the `public` folder, which contains the page, styles, JavaScript, and both image assets. Netlify does not run the Node.js server in `server.js`.

1. In Netlify, connect the GitHub repository `Diva006/Deyvon-Tech`. Set the publish directory to `public` and leave the build command empty; `netlify.toml` provides the publish-directory setting.
2. Ensure Netlify Forms are enabled for the site, then deploy the latest `main` branch. The contact form is named `contact`; a valid production submission is saved in Netlify Forms.
3. In the Netlify site dashboard, open **Forms** and confirm `contact` was detected after deployment. Under form notifications, add an email notification to `deyvontech@gmail.com`.
4. In Netlify's domain settings, add `deyvon.in` and `www.deyvon.in` and follow the exact DNS instructions shown for the site.
5. In GoDaddy's DNS Management, remove old forwarding records and conflicting website A/CNAME records, then enter the records Netlify provides. The current domain has both GoDaddy forwarding addresses and GitHub Pages addresses, which can send visitors to the wrong host. **Do not change MX, SPF, DKIM, DMARC, or other email records.**
6. Wait for DNS propagation and Netlify HTTPS provisioning. Confirm the page and `/logo-mark.png` and `/brand-art.png` load over HTTPS, then submit a test form and verify its entry and email notification in Netlify.

The form uses Netlify Forms in production; its submissions are stored in the Netlify dashboard, so no database or writable server filesystem is required. The local `npm start` development server continues to use the JSON inquiry API.

You must sign in to your own GitHub, Netlify, and GoDaddy accounts to configure deployment, form notifications, and DNS. Check any applicable plan or usage charges in your Netlify account. Never share passwords or other secret credentials in chat.
