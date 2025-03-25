import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Serve node_modules directory for client-side access
app.use("/node_modules", express.static(path.join(__dirname, "..", "node_modules")));

// Special handling for TypeScript files
app.get("*.ts", (req: Request, res: Response) => {
  const tsFilePath = path.join(__dirname, "public", req.path);
  const jsFilePath = tsFilePath.replace(".ts", ".js");

  // Transpile TypeScript file to JavaScript on the fly
  exec(`npx tsc ${tsFilePath} --outFile ${jsFilePath}`, (error) => {
    if (error) {
      console.error(`Error transpiling TypeScript: ${error}`);
      return res.status(500).send("Error processing TypeScript file");
    }

    // Read and send the transpiled JavaScript file
    fs.readFile(jsFilePath, (err, data) => {
      if (err) {
        console.error(`Error reading JavaScript file: ${err}`);
        return res.status(500).send("Error reading JavaScript file");
      }

      res.setHeader("Content-Type", "application/javascript");
      res.send(data);
    });
  });
});

// Serve the index.html for the root route
app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
