import fs from "node:fs";
import http from "node:http";
import https from "node:https";

const token = process.env.SCREEPS_TOKEN;
const branch = process.env.SCREEPS_BRANCH ?? "default";
const protocol = process.env.SCREEPS_PROTOCOL ?? "https";
const hostname = process.env.SCREEPS_HOST ?? "screeps.com";
const port = Number(process.env.SCREEPS_PORT ?? (protocol === "https" ? 443 : 80));
const bundlePath = process.env.SCREEPS_BUNDLE ?? "dist/main.js";

if (!token) {
  throw new Error("SCREEPS_TOKEN is required.");
}

if (!fs.existsSync(bundlePath)) {
  throw new Error(`Bundle not found: ${bundlePath}. Run npm run build first.`);
}

const code = fs.readFileSync(bundlePath, "utf8");
const payload = JSON.stringify({
  branch,
  modules: {
    main: code
  }
});

const client = protocol === "http" ? http : https;

const request = client.request(
  {
    hostname,
    port,
    path: "/api/user/code",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(payload),
      "X-Token": token
    }
  },
  response => {
    let body = "";

    response.setEncoding("utf8");
    response.on("data", chunk => {
      body += chunk;
    });
    response.on("end", () => {
      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
        console.log(`Deployed ${bundlePath} to Screeps branch "${branch}".`);
        return;
      }

      console.error(`Screeps deploy failed with HTTP ${response.statusCode}.`);
      console.error(body);
      process.exitCode = 1;
    });
  }
);

request.on("error", error => {
  console.error(error);
  process.exitCode = 1;
});

request.write(payload);
request.end();
