import { execSync, execFileSync } from "node:child_process";
import readline from "node:readline";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env")
});





// Terminal colors
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

// Get Git changes
function getGitDiff() {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      stdio: "ignore"
    });
  } catch {
    console.error(red("❌ Error: Not inside a Git repository."));
    process.exit(1);
  }

  // First check staged changes
  let diff = execSync("git diff --cached", {
    encoding: "utf8"
  }).trim();

  // If no staged changes, check unstaged changes
  if (!diff) {
    console.log(yellow("⚠️ No staged changes found."));
    console.log(cyan("💡 Checking unstaged changes instead..."));

    diff = execSync("git diff", {
      encoding: "utf8"
    }).trim();
  }

  if (!diff) {
    console.log(
      red("❌ No changes detected! Pehle koi tracked file edit karo.")
    );
    process.exit(1);
  }

  // Limit diff size
  if (diff.length > 8000) {
    diff =
      diff.slice(0, 8000) +
      "\n\n...[diff truncated for brevity]...";
  }

  return diff;
}

// Generate commit message using Gemini
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
- Output only the commit message without Markdown fences.
- Do not invent changes that are not shown in the diff.

Git Diff:
${diff}
`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;

    try {
      console.log(
        cyan(`\nConnecting to Gemini (attempt ${attempt}/3)...`)
      );

      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
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
        throw new Error(
          `Gemini connection failed: ${err.message}`
        );
      }

      console.log(yellow("Temporary connection problem. Retrying..."));

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * 2 ** (attempt - 1))
      );

      continue;
    }

    console.log(
      cyan(`Gemini responded: HTTP ${response.status}`)
    );

    const responseText = await response.text();

    if (!response.ok) {
      const retryable = [429, 500, 502, 503, 504].includes(
        response.status
      );

      if (retryable && attempt < 3) {
        console.log(
          yellow("Temporary API error. Retrying...")
        );

        await new Promise((resolve) =>
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
      ?.map((part) => part.text || "")
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

// Ask user a question
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

// Check and commit changes
function commitChanges(message) {
  const stagedDiff = execSync("git diff --cached", {
    encoding: "utf8"
  }).trim();

  if (!stagedDiff) {
    console.log(
      yellow("\n⚠️ No staged changes. Staging tracked and untracked files...")
    );

    // Safety check: do not automatically stage every file.
    console.log(
      cyan("Run `git status` and stage only the files you want to commit.")
    );

    throw new Error(
      "Nothing is staged. Use `git add <file>` and run CommitCraft again."
    );
  }

  // Pass the message as a separate argument safely
  execFileSync("git", ["commit", "-m", message], {
    stdio: "inherit"
  });
}

// Main application
async function main() {
  console.log(
    `\n${bold(cyan("⚡ CommitCraft - AI Git Commit Assistant"))}\n`
  );

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(
      red("❌ GEMINI_API_KEY environment variable set nahi hai!")
    );

    console.log(
      yellow(
        '👉 PowerShell: $env:GEMINI_API_KEY="YOUR_NEW_API_KEY"'
      )
    );

    process.exit(1);
  }

  const diff = getGitDiff();

  while (true) {
    try {
      console.log(cyan("\n🤖 Analyzing Git diff..."));

      const commitMsg = await generateCommitMessage(diff, apiKey);

      console.log(green("\n✅ Commit message generated!\n"));

      console.log(bold("Proposed Commit Message:"));
      console.log(yellow("------------------------------------------"));
      console.log(green(commitMsg));
      console.log(yellow("------------------------------------------\n"));

      console.log("Actions:");
      console.log(`  ${bold("[Enter / y]")} Commit with this message`);
      console.log(`  ${bold("[r]")}       Regenerate message`);
      console.log(`  ${bold("[e]")}       Edit message manually`);
      console.log(`  ${bold("[q]")}       Quit / Cancel\n`);

      const choice = (
        await promptUser(cyan("Select an option: "))
      ).toLowerCase();

      if (choice === "" || choice === "y") {
        commitChanges(commitMsg);

        console.log(
          green("\n✅ Committed successfully!\n")
        );

        break;
      }

      if (choice === "r") {
        console.log(yellow("\n🔄 Regenerating...\n"));
        continue;
      }

      if (choice === "e") {
        const customMsg = await promptUser(
          cyan("\nEnter your custom commit message: ")
        );

        if (!customMsg) {
          console.log(red("❌ Empty message. Commit cancelled."));
          continue;
        }

        commitChanges(customMsg);

        console.log(
          green("\n✅ Committed successfully with your custom message!\n")
        );

        break;
      }

      console.log(yellow("\nOperation cancelled. No commit made.\n"));
      break;
    } catch (err) {
      console.error(red(`\n❌ Error: ${err.message}\n`));
      break;
    }
  }
}

main();
