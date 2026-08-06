import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  LevelFormat,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  VerticalAlign,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const screenshotPath =
  "C:\\Users\\sharandeep.singh\\Pictures\\Screenshots\\Screenshot 2026-08-04 135848.png";
const outPath = path.join(root, "NIBE-EC2-Deployment-Guide.docx");

const screenshot = fs.readFileSync(screenshotPath);

// US Letter content width with 0.9" margins: 12240 - 2*1296 = 9648
const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1008; // 0.7 inch
const CONTENT_W = PAGE_W - MARGIN * 2; // 10224

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = {
  top: { style: BorderStyle.NIL },
  bottom: { style: BorderStyle.SINGLE, size: 12, color: "1B4F72" },
  left: { style: BorderStyle.NIL },
  right: { style: BorderStyle.NIL },
};

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 276 },
    alignment: opts.align,
    ...opts.para,
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: opts.size ?? 22,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color ?? "222222",
        font: "Arial",
      }),
    ],
  });
}

function runs(parts, spacing = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 276, ...spacing },
    children: parts.map((part) =>
      new TextRun({
        font: "Arial",
        size: 22,
        color: "222222",
        ...part,
      })
    ),
  });
}

function codeBlock(lines) {
  const text = Array.isArray(lines) ? lines.join("\n") : lines;
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    shading: { type: ShadingType.CLEAR, fill: "F4F6F7" },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "D5D8DC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "D5D8DC" },
      left: { style: BorderStyle.SINGLE, size: 12, color: "1B4F72" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "D5D8DC" },
    },
    children: [
      new TextRun({
        text,
        font: "Consolas",
        size: 18,
        color: "1C2833",
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: "Arial", bold: true, size: 32, color: "1B4F72" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, font: "Arial", bold: true, size: 26, color: "2874A6" })],
  });
}

function bullet(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80, line: 276 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "222222" })],
  });
}

function numbered(text, ref = "steps") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80, line: 276 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "222222" })],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill
      ? { fill: opts.fill, type: ShadingType.CLEAR }
      : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: "Arial",
            size: opts.size ?? 20,
            bold: opts.bold,
            color: opts.color ?? "222222",
          }),
        ],
      }),
    ],
  });
}

function infoTable(rows) {
  const col1 = 2800;
  const col2 = CONTENT_W - col1;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col1, col2],
    rows: rows.map((r, i) =>
      new TableRow({
        children: [
          cell(r[0], col1, {
            bold: true,
            fill: i === 0 ? "1B4F72" : "EBF5FB",
            color: i === 0 ? "FFFFFF" : "1B4F72",
          }),
          cell(r[1], col2, {
            bold: i === 0,
            fill: i === 0 ? "1B4F72" : undefined,
            color: i === 0 ? "FFFFFF" : "222222",
          }),
        ],
      })
    ),
  });
}

function secTable(rows) {
  const cols = [2200, 1600, 2800, CONTENT_W - 2200 - 1600 - 2800];
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: cols,
    rows: rows.map((r, i) =>
      new TableRow({
        children: r.map((text, j) =>
          cell(text, cols[j], {
            bold: i === 0 || j === 0,
            fill: i === 0 ? "1B4F72" : undefined,
            color: i === 0 ? "FFFFFF" : "222222",
            size: 18,
          })
        ),
      })
    ),
  });
}

// Screenshot scaled to content width (~6.5")
const imgDisplayW = 620;
const imgDisplayH = Math.round((1273 / 2879) * imgDisplayW);

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22 },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1B4F72" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2874A6" },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "bullets2",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "bullets3",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "checks",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "troubles",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "steps",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "steps2",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "steps3",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "steps4",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "steps5",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "steps6",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "sg",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 12, color: "1B4F72", space: 4 },
              },
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "NIBE Limited  |  AWS EC2 Deployment Guide",
                  font: "Arial",
                  size: 18,
                  bold: true,
                  color: "1B4F72",
                }),
                new TextRun({
                  text: "  ·  Static Website (HTML/CSS/JS)",
                  font: "Arial",
                  size: 18,
                  color: "666666",
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 4 },
              },
              spacing: { before: 80 },
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Confidential  ·  Page ",
                  font: "Arial",
                  size: 16,
                  color: "666666",
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: "Arial",
                  size: 16,
                  color: "666666",
                }),
                new TextRun({
                  text: " of ",
                  font: "Arial",
                  size: 16,
                  color: "666666",
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  font: "Arial",
                  size: 16,
                  color: "666666",
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: "Deploy NIBE Limited Website on AWS EC2",
              font: "Arial",
              bold: true,
              size: 40,
              color: "1B4F72",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Step-by-step guide for Amazon Linux 2023  ·  August 2026",
              font: "Arial",
              size: 22,
              color: "555555",
              italics: true,
            }),
          ],
        }),

        h1("1. What You Already Have"),
        p(
          "Your EC2 instance is created and you are connected via the AWS browser terminal (EC2 Instance Connect). From your screenshot:"
        ),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 80 },
          children: [
            new ImageRun({
              type: "png",
              data: screenshot,
              transformation: { width: imgDisplayW, height: imgDisplayH },
              altText: {
                title: "EC2 terminal screenshot",
                description:
                  "AWS console browser session showing Amazon Linux 2023 and ec2-user shell",
                name: "ec2-screenshot",
              },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: "Figure 1. Your EC2 browser session (Amazon Linux 2023, user: ec2-user)",
              font: "Arial",
              size: 18,
              italics: true,
              color: "666666",
            }),
          ],
        }),

        infoTable([
          ["Item", "Value from your setup"],
          ["Operating system", "Amazon Linux 2023"],
          ["Shell user", "ec2-user"],
          ["Region", "Asia Pacific (Mumbai) ap-south-1"],
          ["Private host", "ip-172-31-2-91 (internal VPC IP)"],
          ["Website type", "Static HTML/CSS/JS (no Node server required)"],
          ["Local project folder", "D:\\Nibe-Limited-main"],
        ]),

        p(
          "Important: Amazon Linux uses dnf (not apt). The login user is ec2-user (not ubuntu). Commands below match your OS.",
          { before: 160, bold: true, color: "922B21" }
        ),

        h1("2. Open HTTP/HTTPS in the Security Group"),
        p(
          "Before the website can load in a browser, the instance security group must allow inbound traffic on ports 80 (HTTP) and 443 (HTTPS)."
        ),
        numbered("In AWS Console, open EC2 → Instances → select your instance.", "sg"),
        numbered("Open the Security tab → click the security group link.", "sg"),
        numbered("Edit inbound rules → Add rule for each of the following:", "sg"),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
        secTable([
          ["Type", "Port", "Source", "Purpose"],
          ["SSH", "22", "My IP (recommended)", "Terminal / SCP access"],
          ["HTTP", "80", "0.0.0.0/0", "Public website"],
          ["HTTPS", "443", "0.0.0.0/0", "SSL later (optional now)"],
        ]),
        p("Save rules. Note your instance Public IPv4 address from the instance summary page (you will use it as the site URL).", {
          before: 120,
        }),

        h1("3. Install and Start Nginx on the EC2 Instance"),
        p(
          "In the browser terminal (or SSH session) where you see the ec2-user prompt, run these commands one block at a time."
        ),
        h2("3.1 Update packages and install Nginx"),
        codeBlock([
          "sudo dnf update -y",
          "sudo dnf install -y nginx unzip",
          "sudo systemctl enable nginx",
          "sudo systemctl start nginx",
          "sudo systemctl status nginx",
        ].join("\n")),
        p(
          "If status shows active (running), open http://YOUR_PUBLIC_IP in a browser. You should see the default Nginx welcome page. That confirms ports and Nginx work."
        ),

        h2("3.2 Create the website directory"),
        codeBlock([
          "sudo mkdir -p /var/www/nibe",
          "sudo chown -R ec2-user:ec2-user /var/www/nibe",
          "ls -la /var/www/nibe",
        ].join("\n")),

        h1("4. Upload Website Files from Your Windows PC"),
        p(
          "Do not upload the node_modules folder. It is only for local image tools and is large. Prefer zipping the site first."
        ),

        h2("4.1 Create a zip on Windows (PowerShell)"),
        p("Open PowerShell on your PC and run:"),
        codeBlock([
          "cd D:\\Nibe-Limited-main",
          "Get-ChildItem -Force |",
          "  Where-Object { $_.Name -notin @('node_modules','.git','nibe-site.zip','scripts','package.json','package-lock.json','vercel.json','NIBE-EC2-Deployment-Guide.docx') } |",
          "  Compress-Archive -DestinationPath D:\\nibe-site.zip -Force",
          "Get-Item D:\\nibe-site.zip",
        ].join("\n")),
        p(
          "You need the HTML pages (index.html, About_us.html, …), Style.css, Main.js, image-perf.js, and all image/video folders."
        ),

        h2("4.2 Option A — Upload with SCP (key pair required)"),
        p(
          "If you have the .pem key file from when the instance was created, use SCP from PowerShell. Replace paths and IP:"
        ),
        codeBlock([
          "# Optional: restrict key permissions (Windows)",
          'icacls "C:\\path\\to\\your-key.pem" /inheritance:r',
          'icacls "C:\\path\\to\\your-key.pem" /grant:r "$($env:USERNAME):(R)"',
          "",
          "scp -i \"C:\\path\\to\\your-key.pem\" D:\\nibe-site.zip ec2-user@YOUR_PUBLIC_IP:~/",
        ].join("\n")),

        h2("4.3 Option B — Upload via AWS Systems Manager / S3 (no SCP)"),
        p("If you do not have the .pem file handy:"),
        numbered("In AWS Console → S3 → Create bucket (or use existing) in ap-south-1.", "steps2"),
        numbered("Upload D:\\nibe-site.zip to the bucket.", "steps2"),
        numbered(
          "On EC2 (browser terminal), if the instance has an IAM role with S3 read access:",
          "steps2"
        ),
        codeBlock([
          "cd ~",
          "aws s3 cp s3://YOUR-BUCKET-NAME/nibe-site.zip .",
          "unzip -o nibe-site.zip -d /var/www/nibe",
          "ls /var/www/nibe/index.html",
        ].join("\n")),
        p(
          "If aws is not configured or there is no IAM role, attach an instance role with AmazonS3ReadOnlyAccess (or a custom bucket-read policy), or use SCP (Option A)."
        ),

        h2("4.4 Option C — Paste small files only (not recommended for full site)"),
        p(
          "The full site includes large videos and images. Browser paste is impractical. Use SCP or S3."
        ),

        h2("4.5 Extract files on EC2 (after zip is on the instance)"),
        codeBlock([
          "cd ~",
          "unzip -o nibe-site.zip -d /var/www/nibe",
          "ls -la /var/www/nibe",
          "# index.html must be directly under /var/www/nibe",
          "test -f /var/www/nibe/index.html && echo OK || echo MISSING_INDEX",
        ].join("\n")),
        p(
          "If unzip created an extra nested folder (for example /var/www/nibe/Nibe-Limited-main/index.html), move contents up one level:"
        ),
        codeBlock([
          "# Only if files landed in a subfolder",
          "cd /var/www/nibe",
          "ls",
          "# Example fix:",
          "# mv Nibe-Limited-main/* .",
          "# rmdir Nibe-Limited-main",
        ].join("\n")),

        h1("5. Configure Nginx for the NIBE Site"),
        h2("5.1 Create site config"),
        codeBlock([
          "sudo tee /etc/nginx/conf.d/nibe.conf > /dev/null << 'EOF'",
          "server {",
          "    listen 80 default_server;",
          "    listen [::]:80 default_server;",
          "    server_name _;",
          "",
          "    root /var/www/nibe;",
          "    index index.html;",
          "",
          "    location / {",
          "        try_files $uri $uri/ $uri.html =404;",
          "    }",
          "",
          "    location ~* \\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|mp4|webm)$ {",
          "        expires 30d;",
          "        add_header Cache-Control \"public\";",
          "    }",
          "",
          "    add_header X-Content-Type-Options nosniff;",
          "    add_header X-Frame-Options SAMEORIGIN;",
          "    add_header Referrer-Policy \"strict-origin-when-cross-origin\";",
          "}",
          "EOF",
        ].join("\n")),

        h2("5.2 Disable default server conflict (if needed)"),
        codeBlock([
          "# If default.conf also claims default_server, rename it:",
          "sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true",
        ].join("\n")),

        h2("5.3 Set permissions and reload Nginx"),
        codeBlock([
          "sudo chown -R ec2-user:nginx /var/www/nibe",
          "sudo find /var/www/nibe -type d -exec chmod 755 {} \\;",
          "sudo find /var/www/nibe -type f -exec chmod 644 {} \\;",
          "sudo nginx -t",
          "sudo systemctl reload nginx",
        ].join("\n")),

        h1("6. Verify the Website"),
        numbered("Copy Public IPv4 from EC2 → Instances.", "steps3"),
        numbered("Open http://YOUR_PUBLIC_IP in Chrome/Edge.", "steps3"),
        numbered("Confirm Home page loads (index.html).", "steps3"),
        numbered("Click About Us, Land Systems, Investors, etc.", "steps3"),
        numbered("Check that images and videos load (may be slow the first time).", "steps3"),
        p("Quick server-side check:", { before: 120 }),
        codeBlock([
          "curl -I http://127.0.0.1/",
          "curl -s http://127.0.0.1/ | head -n 20",
        ].join("\n")),

        h1("7. Optional: Custom Domain and HTTPS"),
        h2("7.1 DNS"),
        bullet("Create an A record: yourdomain.com → Public IPv4 of the instance", "bullets2"),
        bullet("Optional: www CNAME → yourdomain.com", "bullets2"),
        p("If the instance uses a dynamic public IP, allocate an Elastic IP and associate it so the IP does not change after stop/start."),

        h2("7.2 Free SSL with Let’s Encrypt (Certbot)"),
        codeBlock([
          "sudo dnf install -y certbot python3-certbot-nginx",
          "sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com",
          "sudo systemctl reload nginx",
        ].join("\n")),
        p("Certbot will adjust the Nginx config for HTTPS. Renewals are typically automatic via a timer/cron installed by the package."),

        h1("8. Updating the Site Later"),
        numbered("Edit files locally under D:\\Nibe-Limited-main.", "steps4"),
        numbered("Re-zip (excluding node_modules) and upload again via SCP or S3.", "steps4"),
        numbered("On EC2:", "steps4"),
        codeBlock([
          "unzip -o ~/nibe-site.zip -d /var/www/nibe",
          "sudo systemctl reload nginx",
        ].join("\n")),

        h1("9. Troubleshooting"),
        infoTable([
          ["Problem", "What to check"],
          ["Browser timeout / no response", "Security group: HTTP port 80 open; instance running"],
          ["Nginx default page still shows", "nibe.conf root path; default.conf disabled; reload nginx"],
          ["403 Forbidden", "chmod 755 on folders, 644 on files; SELinux rarely blocks static files"],
          ["404 on Home", "Confirm /var/www/nibe/index.html exists (not nested folder)"],
          ["Images/videos missing", "Folder names with spaces uploaded correctly; case-sensitive paths"],
          ["SCP Permission denied", "User must be ec2-user; correct .pem; SG allows SSH from your IP"],
          ["dnf / nginx not found", "You are on Amazon Linux 2023 — use dnf install nginx"],
        ]),

        p("Useful logs:", { before: 140 }),
        codeBlock([
          "sudo tail -n 50 /var/log/nginx/error.log",
          "sudo journalctl -u nginx -n 50 --no-pager",
        ].join("\n")),

        h1("10. Checklist Summary"),
        bullet("EC2 instance running (Amazon Linux 2023) — DONE", "checks"),
        bullet("Connected as ec2-user — DONE (see Figure 1)", "checks"),
        bullet("Security group: SSH + HTTP (+ HTTPS)", "checks"),
        bullet("Install Nginx with dnf", "checks"),
        bullet("Upload zip of site (no node_modules)", "checks"),
        bullet("Extract to /var/www/nibe with index.html at root", "checks"),
        bullet("Nginx config root → /var/www/nibe", "checks"),
        bullet("Open http://PUBLIC_IP and test all pages", "checks"),
        bullet("(Optional) Elastic IP + domain + Certbot SSL", "checks"),

        h1("11. Quick Command Cheat Sheet"),
        p("On EC2 (Amazon Linux 2023):", { bold: true }),
        codeBlock([
          "sudo dnf install -y nginx unzip",
          "sudo systemctl enable --now nginx",
          "sudo mkdir -p /var/www/nibe && sudo chown ec2-user:ec2-user /var/www/nibe",
          "unzip -o ~/nibe-site.zip -d /var/www/nibe",
          "sudo nginx -t && sudo systemctl reload nginx",
        ].join("\n")),
        p("From Windows (with key):", { bold: true, before: 80 }),
        codeBlock(
          'scp -i "C:\\path\\to\\key.pem" D:\\nibe-site.zip ec2-user@YOUR_PUBLIC_IP:~/'
        ),

        new Paragraph({
          spacing: { before: 280, after: 80 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 12, color: "1B4F72", space: 8 },
          },
          children: [
            new TextRun({
              text: "End of guide  ·  NIBE Limited static website on AWS EC2",
              font: "Arial",
              size: 18,
              color: "666666",
              italics: true,
            }),
          ],
        }),
        p(
          "This document was generated for your current instance profile (Amazon Linux 2023 / ec2-user / Mumbai region). Replace YOUR_PUBLIC_IP and key paths with your real values.",
          { size: 18, color: "666666", italics: true }
        ),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log("Wrote", outPath, "bytes", buffer.length);
