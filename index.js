#!/usr/bin/env node


import readline from "node:readline";
import { execSync, execFileSync } from "node:child_process";
// Colors for terminal styling
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

function getGitDiff() {
  try {
    // Check if inside a git repository
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  } catch {
    console.error(red("❌ Error: Not inside a Git repository."));
    process.exit(1);
  }

  // Get staged diff
  let diff = execSync("git diff --cached", { encoding: "utf-8" }).trim();

  // If no staged changes, check unstaged
  if (!diff) {
    console.log(yellow("⚠️ No staged changes found (`git add` nahi kiya hua)."));
    console.log(cyan("💡 Checking unstaged changes instead..."));
    diff = execSync("git diff", { encoding: "utf-8" }).trim();
  }

  if (!diff) {
    console.log(red("❌ No changes detected to commit! Pehle koi file edit karo."));
    process.exit(1);
  }

  // Limit diff size to ~8000 chars so prompt stays fast & clean
  if (diff.length > 8000) {
    diff = diff.slice(0, 8000) + "\n\n...[diff truncated for brevity]...";
  }

  return diff;
}

// async function generateCommitMessage(diff, apiKey) {
//   const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

//   const prompt = `
// You are an expert Git commit assistant.
// Generate a concise, standard Conventional Commit message for the provided Git diff.

// Rules:
// 1. Follow Conventional Commits format: <type>(<scope optional>): <short description>
//    - types: feat, fix, docs, style, refactor, perf, test, chore
// 2. Limit the first line (subject) to max 72 characters.
// 3. Be specific and descriptive of what actually changed.
// 4. Output ONLY the commit message in plain text. Do NOT wrap it in backticks or markdown quotes.
// 5. If necessary, you may add an optional 1-line bullet list below it separated by an empty line.

// Git Diff:
// ${diff}
// `;

//   const response = await fetch(url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       contents: [{ parts: [{ text: prompt }] }],
//       generationConfig: {
//         temperature: 0.2,
//         maxOutputTokens: 150
//       }
//     })
//   });

//   if (!response.ok) {
//     const errText = await response.text();
//     throw new Error(`API Error (${response.status}): ${errText}`);
//   }

//   const data = await response.json();
//   const message = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

//   if (!message) {
//     throw new Error("Empty response from AI.");
//   }

//   // Clean any markdown backticks if AI added them
//   return message.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
// }

async function generateCommitMessage(diff, apiKey) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

  const prompt = `
You are an expert Git commit assistant.

Generate one concise Conventional Commit message for this Git diff.

Rules:
- Use feat, fix, docs, style, refactor, perf, test, or chore.
- Keep the first line under 73 characters.
- Describe the actual changes accurately.
- Output only the commit message, without Markdown fences.

Git Diff:
${diff}
`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;

    try {
      console.log(`\nConnecting to Gemini (attempt ${attempt}/3)...`);

      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 150
          }
        }),
        signal: AbortSignal.timeout(30000)
      });
    } catch (err) {
      const temporary =
        err.name === "TimeoutError" ||
        err.name === "AbortError" ||
        err.name === "TypeError";

      if (!temporary || attempt === 3) {
        throw new Error(`Gemini connection failed: ${err.message}`);
      }

      console.log("Temporary connection problem. Retrying...");
      await new Promise(resolve =>
        setTimeout(resolve, 1000 * 2 ** (attempt - 1))
      );
      continue;
    }

    console.log(`Gemini responded: HTTP ${response.status}`);

    const responseText = await response.text();

    if (!response.ok) {
      const retryable = [429, 500, 502, 503, 504]
        .includes(response.status);

      if (retryable && attempt < 3) {
        console.log("Temporary API error. Retrying...");
        await new Promise(resolve =>
          setTimeout(resolve, 1000 * 2 ** (attempt - 1))
        );
        continue;
      }

      throw new Error(
        `Gemini API Error (${response.status}): ${responseText}`
      );
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("Gemini returned invalid JSON.");
    }

    const message = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!message) {
      throw new Error(
        `No commit message returned. Response: ${responseText}`
      );
    }

    return message
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  throw new Error("Gemini request failed after retries.");
}

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log(`\n${bold(cyan("⚡ CommitCraft - AI Git Commit Assistant"))}\n`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(red("❌ GEMINI_API_KEY environment variable set nahi hai!"));
    console.log(yellow("👉 Run: $env:GEMINI_API_KEY=\"your_api_key_here\" (PowerShell)"));
    process.exit(1);
  }

  const diff = getGitDiff();

  let accepted = false;

  while (!accepted) {
    process.stdout.write(cyan("🤖 Analyzing diff & generating commit message... "));
    try {
      const commitMsg = await generateCommitMessage(diff, apiKey);
      console.log(green("Done!\n"));

      console.log(bold("Proposed Commit Message:"));
      console.log(yellow("--------------------------------------------------"));
      console.log(green(commitMsg));
      console.log(yellow("--------------------------------------------------\n"));

      console.log("Actions:");
      console.log(`  ${bold("[Enter / y]")} Commit with this message`);
      console.log(`  ${bold("[r]")}       Regenerate`);
      console.log(`  ${bold("[e]")}       Edit message manually`);
      console.log(`  ${bold("[q]")}       Quit / Cancel\n`);

      const choice = await promptUser(cyan("Select an option: "));

      if (choice === "" || choice.toLowerCase() === "y") {
        // Stage unstaged if needed
        const stagedCheck = execSync("git diff --cached", { encoding: "utf-8" }).trim();
        if (!stagedCheck) {
          execSync("git add -A");
        }

        // Commit safely using git commit -m
        // execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
        execFileSync("git", ["commit", "-m", commitMsg], {
  stdio: "inherit"
});
        console.log(`\n${green("✅ Committed successfully!")}\n`);
        accepted = true;
      } else if (choice.toLowerCase() === "r") {
        console.log(yellow("\n🔄 Regenerating...\n"));
      } else if (choice.toLowerCase() === "e") {
        const customMsg = await promptUser(cyan("\nEnter your custom commit message: "));
        if (customMsg) {
          const stagedCheck = execSync("git diff --cached", { encoding: "utf-8" }).trim();
          if (!stagedCheck) execSync("git add -A");
          // execSync(`git commit -m "${customMsg.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
          execFileSync("git", ["commit", "-m", commitMsg], {
  stdio: "inherit"
});
          console.log(`\n${green("✅ Committed successfully with custom message!")}\n`);
        } else {
          console.log(red("Cancelled: Empty message."));
        }
        accepted = true;
      } else {
        console.log(yellow("\nOperation cancelled. No commit made.\n"));
        accepted = true;
      }
    } catch (err) {
      console.error(red(`\n❌ Error: ${err.message}`));
      break;
    }
  }
}

main();
