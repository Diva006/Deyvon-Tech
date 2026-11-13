const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
require("dotenv").config();
const nodemailer = require("nodemailer");

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY_BYTES = 12_000;
const INQUIRY_FILE = path.resolve(__dirname, process.env.INQUIRY_FILE || path.join("data", "inquiries.jsonl"));
const smtpPort = Number(process.env.SMTP_PORT || 465);
const emailRecipient = process.env.EMAIL_TO || "deyvontech@gmail.com";
const emailConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  Number.isInteger(smtpPort) &&
  smtpPort > 0 &&
  smtpPort <= 65535
);
const mailTransport = emailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: process.env.SMTP_SECURE !== "false",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  : null;
const services = new Set([
  "Custom software",
  "Inventory & management",
  "Business process automation",
  "Web application",
  "Tracking & reporting",
  "Something else",
]);
const publicFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/logo-mark.png", ["logo-mark.png", "image/png"]],
  ["/brand-art.png", ["brand-art.png", "image/png"]],
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
      } else {
        chunks.push(chunk);
      }
    });
    request.on("end", () => {
      if (tooLarge) {
        reject(Object.assign(new Error("Your message is too long. Please shorten it and try again."), { statusCode: 413 }));
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Please send a valid inquiry and try again."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function validateInquiry(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Please provide your contact details and project message.";
  }

  const fields = ["name", "email", "phone", "service", "message"];
  if (fields.some((field) => body[field] !== undefined && typeof body[field] !== "string")) {
    return "Please check your details and try again.";
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const phone = (body.phone || "").trim();
  const service = (body.service || "").trim();
  const message = (body.message || "").trim();

  if (name.length < 2 || name.length > 100) return "Please enter your name (2–100 characters).";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  if (phone.length > 30 || (phone && !/^[+\d().\-\s]+$/.test(phone))) return "Please check your phone number.";
  if (!services.has(service)) return "Please choose one of the listed services.";
  if (message.length < 10 || message.length > 3000) return "Please describe your project in 10–3,000 characters.";

  return {
    name,
    email,
    phone,
    service,
    message,
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function sendInquiryEmail(inquiry) {
  const name = escapeHtml(inquiry.name);
  const email = escapeHtml(inquiry.email);
  const phone = escapeHtml(inquiry.phone || "Not provided");
  const service = escapeHtml(inquiry.service);
  const message = escapeHtml(inquiry.message).replace(/\r?\n/g, "<br>");

  await mailTransport.sendMail({
    from: {
      name: "Deyvon Tech Website",
      address: process.env.SMTP_USER,
    },
    to: emailRecipient,
    replyTo: inquiry.email,
    subject: "New website inquiry — Deyvon Tech",
    disableFileAccess: true,
    disableUrlAccess: true,
    text: [
      "A new inquiry was submitted through the Deyvon Tech website.",
      "",
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email}`,
      `Phone: ${inquiry.phone || "Not provided"}`,
      `Service: ${inquiry.service}`,
      "",
      "Project details:",
      inquiry.message,
    ].join("\n"),
    html: [
      "<h2>New Deyvon Tech website inquiry</h2>",
      `<p><strong>Name:</strong> ${name}</p>`,
      `<p><strong>Email:</strong> ${email}</p>`,
      `<p><strong>Phone:</strong> ${phone}</p>`,
      `<p><strong>Service:</strong> ${service}</p>`,
      `<p><strong>Project details:</strong><br>${message}</p>`,
      "<p>You can reply directly to this email to contact the sender.</p>",
    ].join(""),
  });
}

async function saveInquiry(inquiry) {
  await fs.mkdir(path.dirname(INQUIRY_FILE), { recursive: true });
  const record = JSON.stringify({ ...inquiry, receivedAt: new Date().toISOString() });
  await fs.appendFile(INQUIRY_FILE, `${record}\n`, { encoding: "utf8", mode: 0o600 });
}

async function handleInquiry(request, response) {
  if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    sendJson(response, 415, { error: "Please submit your inquiry using the website form." });
    return;
  }

  let inquiry;
  try {
    const body = await readJsonBody(request);
    const validationResult = validateInquiry(body);
    if (typeof validationResult === "string") {
      sendJson(response, 400, { error: validationResult });
      return;
    }

    inquiry = validationResult;
    await saveInquiry(inquiry);
  } catch (error) {
    if (error.statusCode) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    console.error("Unable to save contact inquiry:", error);
    sendJson(response, 500, { error: "We couldn't save your inquiry right now. Please email deyvontech@gmail.com instead." });
    return;
  }

  if (!emailConfigured) {
    sendJson(response, 503, {
      error: "Your inquiry was saved, but email notifications aren't set up yet. Please email deyvontech@gmail.com directly.",
    });
    return;
  }

  try {
    await sendInquiryEmail(inquiry);
    sendJson(response, 201, {
      message: `Thanks for reaching out. Your inquiry has been emailed to ${emailRecipient}.`,
    });
  } catch (error) {
    console.error("Unable to email contact inquiry:", error);
    sendJson(response, 502, {
      error: `Your inquiry was saved, but we couldn't send the email notification. Please email deyvontech@gmail.com directly.`,
    });
  }
}

async function handleStaticFile(pathname, request, response) {
  const file = publicFiles.get(pathname);
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    response.end("Not found");
    return;
  }

  try {
    const content = await fs.readFile(path.join(__dirname, file[0]));
    response.writeHead(200, {
      "Content-Type": file[1],
      "Content-Length": content.length,
      "Cache-Control": pathname === "/" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    console.error(`Unable to read public file ${file[0]}:`, error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Unable to load this page.");
  }
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;

  if (pathname === "/health" && (request.method === "GET" || request.method === "HEAD")) {
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : "ok");
    return;
  }

  if (pathname === "/api/inquiries") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "This endpoint accepts POST requests only." });
      return;
    }
    handleInquiry(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
    return;
  }

  handleStaticFile(pathname, request, response);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Deyvon Tech website running at http://localhost:${PORT}`);
    if (!emailConfigured) {
      console.warn("Email notifications are disabled. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.");
    }
  });

  server.on("error", (error) => {
    console.error("Unable to start the Deyvon Tech website:", error);
    process.exitCode = 1;
  });
}

module.exports = server;
