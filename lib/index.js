"use strict";
/** @format */
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const marked = require("marked");
const puppeteer = require("puppeteer");
const shell = require("shelljs");
const command_1 = require("@oclif/command");
const fs_1 = require("fs");
const convertCss = {
    zb_ppt: __dirname + "/../asset/ppt.css",
    zb_ppt_large: __dirname + "/../asset/ppt-large.css",
    zb_doc: __dirname + "/../asset/doc.css",
    zb_official: __dirname + "/../asset/official.css",
};
class Zigzi extends command_1.Command {
    constructor() {
        super(...arguments);
        this.file = "";
        this.converType = "";
    }
    async run() {
        var _a, _b;
        const { args, flags } = this.parse(Zigzi);
        const output = (_a = flags.output) !== null && _a !== void 0 ? _a : "pdf";
        this.file = args.file;
        this.converType = (_b = flags.template) !== null && _b !== void 0 ? _b : "zb_doc";
        if (flags.vscode) {
            await this.setVSCodeSetting();
        }
        if (args.file) {
            if (this.converType.indexOf("ppt") > -1) {
                await this.marp();
            }
            else {
                await this.toHtml();
                if (output === "pdf") {
                    await this.toPdf();
                }
            }
        }
    }
    async marp() {
        const { args, flags } = this.parse(Zigzi);
        let md = fs.readFileSync(this.file, "utf8");
        const cssFile = (md.indexOf("theme: ppt-large") > 0) ? convertCss["zb_ppt_large"] : convertCss["zb_ppt"];
        const pdfFileName = `${this.file.replace(".md", ".pdf")}`;
        await child_process.execSync(`npx @marp-team/marp-cli@latest --allow-local-files ${this.file} -o ${pdfFileName} --theme ${cssFile}`);
    }
    async toHtml() {
        const { flags } = this.parse(Zigzi);
        const cssType = convertCss[this.converType];
        const htmlFileName = `${this.file.replace(".md", ".html")}`;
        let md = fs.readFileSync(this.file, "utf8");
        const pageBreak = /<!-- page-break -->/g;
        md = md.replace(pageBreak, `<hr class="page-break" />`);
        md = md.replace(RegExp(/<!--[^>]/g), "");
        md = md.replace(RegExp(/-->/g), "");
        let markedHtml;
        if (flags.template === "zb_official") {
            markedHtml = `<header></header> ${marked(md)}<footer></footer>`;
        }
        else {
            markedHtml = marked(md);
        }
        const css = fs.readFileSync(cssType, "utf8");
        const html = `
		<!doctype html>
		<html>
		    <head>
		        <meta charset="utf-8"/>
		        <style>${css}</style>
		    </head>
		    <body><div id="zigbang-zigzi">${markedHtml}</div></body>
		</html>`;
        const stream = await fs.createWriteStream(`${htmlFileName}`);
        await stream.once("open", () => {
            stream.write(html);
            stream.end();
        });
    }
    async toPdf() {
        const { flags } = this.parse(Zigzi);
        const htmlFileName = `${this.file.replace(".md", ".html")}`;
        const pdfFileName = `${this.file.replace(".md", ".pdf")}`;
        const headerFooterTemplate = (flags.template === "zb_doc") ? {
            displayHeaderFooter: true
        } : {};
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`file://${path.resolve(htmlFileName)}`, {
            waitUntil: "networkidle2",
        });
        await page.emulateMediaType("screen");
        await page.pdf({
            format: "a4",
            path: `${path.resolve(pdfFileName)}`,
            printBackground: true,
            headerTemplate: `<div class="header" style="background:#ffa400; top:0 !important; width:16px; height:884px; margin:-20px 0 0 !important; padding:0 !important;  -webkit-print-color-adjust: exact;"></div>`,
            footerTemplate: `<div class="footer" style="padding: 0 !important; margin: 0 !important; z-index:100 !important; position:relative !important; -webkit-print-color-adjust: exact; width: 100%; text-align: center; color:#000; font-size: 10px; font-family: Arial, sans-serif;"><span class="pageNumber"></span></div>`,
            displayHeaderFooter: (flags.template === "zb_doc"),
            margin: {
                top: 50,
                bottom: 50,
                left: 58,
                right: 58,
            },
        });
        await browser.close();
        await fs.unlinkSync(`${htmlFileName}`);
    }
    async setVSCodeSetting() {
        const location = shell.exec("pwd");
        const setting_location = process.platform === "win32" ? "%APPDATA%\/Code\/User\/" : "~/Library/Application Support/Code/User/";
        JSON.stringify;
        shell.cd(setting_location);
        shell.exec("pwd");
        const settingsBuffer = await (0, fs_1.readFileSync)("settings.json", { encoding: "utf8" });
        let settings = settingsBuffer;
        const css = `
        "https://zigbang.github.io/zigzi/asset/ppt.css",
        "https://zigbang.github.io/zigzi/asset/presentation.css",
        "https://zigbang.github.io/zigzi/asset/doc.css",
        "https://zigbang.github.io/zigzi/asset/official.css"
        `;
        if (settings.indexOf("markdown.marp.themes") === -1) {
            settings = settings.replace(/{/, `{"markdown.marp.themes": [${css}],`);
        }
        else {
            const startStr = settings.indexOf('"markdown.marp.themes":');
        }
        await (0, fs_1.writeFileSync)("settings.json", settings);
        shell.cd(location);
        shell.exec("pwd");
    }
}
Zigzi.description = "Convert markdown to pdf with zigbang document style";
Zigzi.flags = {
    version: command_1.flags.version({ char: "v" }),
    help: command_1.flags.help({ char: "h" }),
    template: command_1.flags.string({
        char: "t",
        description: "select a document template to convert",
        options: Object.keys(convertCss),
    }),
    output: command_1.flags.string({
        char: "o",
        description: "select output type",
        options: ["pdf", "html"],
    }),
    vscode: command_1.flags.boolean({
        description: "vscode markdown template setting",
    })
};
Zigzi.args = [
    {
        name: "file",
        description: "Please enter a md file name",
    },
];
module.exports = Zigzi;
