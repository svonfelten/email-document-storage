import { connect, ImapSimple, ImapSimpleOptions } from "imap-simple";
import { ParsedMail, simpleParser } from "mailparser";
import * as _ from "lodash";
import path from "path";
import fs from "fs";
import { Command, OptionValues } from "commander";

let directory = "./out";
function validatePath(str: string) {
  try {
    if (!fs.existsSync(str)) {
      console.log("First run creating the directory", str);
      fs.mkdirSync(str);
      directory = str;
    }
  } catch (err) {
    console.error(
      "The specified path is not valid cannot acces or create the output directory"
    );
    process.exit(0);
  }
}

function isValidRelativePath(str: string): boolean {
  const relativePathRegex = /^(?!\/|(?:[a-zA-Z]:)?[\\/])[^\0<>:"|?*]+$/;
  if (!relativePathRegex.test(str) || path.isAbsolute(str)) {
    return false;
  }

  const normalizedPath = path.normalize(str);

  if (normalizedPath.startsWith("..")) {
    return false;
  }

  return true;
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLocaleLowerCase();
}

function capitalizeFirstLetterPath(string: string) {
  return string.split("/").map(capitalizeFirstLetter).join("/");
}

const downloadAttachments = async (mail: ParsedMail) => {
  if (mail.subject && mail.attachments && mail.attachments.length > 0) {
    let downloadDir = path.resolve(directory);
    let folder = capitalizeFirstLetterPath(mail.subject);
    if (!folder || !isValidRelativePath(folder)) {
      folder = "error";
    }
    downloadDir = path.join(downloadDir, folder);

    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    for (const attachment of mail.attachments) {
      const filePath = path.join(
        downloadDir,
        attachment.filename || "attachment"
      );

      fs.writeFileSync(filePath, attachment.content);
      console.log(`Attachment saved to ${filePath}`);
    }
  }
};

function getEmailConfig(path: string) {
  const content = fs.readFileSync(path, { encoding: "utf-8" });

  return { imap: JSON.parse(content) };
}

let deleteAfterParse = true;

function validateArgs(options: OptionValues) {
  if (options.output) {
    validatePath(options.output);
  }

  if (options.config) {
    if (!fs.existsSync(options.config)) {
      console.error("The email config file does not exist");
    }
  }

  if (options.noDelete) {
    deleteAfterParse = false;
  }
}

async function main() {
  const program = new Command();

  program
    .option(
      "-c, --config <path>",
      "Path to the email config file",
      "./email.conf"
    )
    .option("-o, --output <path>", "Path to the output directory", "./out")
    .option("--no-delete", "Do not delete email")
    .parse(process.argv);

  const options = program.opts();

  validateArgs(options);

  try {
    const config = getEmailConfig(options.config);

    const connection: ImapSimple = await connect(config);

    await connection.openBox("INBOX");
    const searchCriteria = ["ALL"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""],
    };
    const messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length == 0) {
      console.log("No mail detected");
    }

    for (let i = 0; i < messages.length; i++) {
      const item = messages[i];
      var all = _.find(item.parts, { which: "" });
      var id = item.attributes.uid;
      var idHeader = "Imap-Id: " + id + "\r\n";
      const parsedEmail = await simpleParser(idHeader + all?.body);

      console.log("Parsing ", parsedEmail.subject);
      await downloadAttachments(parsedEmail);

      if (deleteAfterParse) {
        connection.addFlags(item.attributes.uid, "Deleted");
      }
    }

    connection.imap.closeBox(true, (err) => {
      //Pass in false to avoid delete-flagged messages being removed
      if (err) {
        console.log(err);
      }
    });
    connection.end();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
