/** @format */

import * as fs from "fs"
import * as path from "path"
import * as child_process from "child_process"
import * as marked from "marked"
import * as puppeteer from "puppeteer"
import * as shell from "shelljs"
import * as pdfParse from "pdf-parse"

import { Command, flags } from "@oclif/command"
import { readFileSync, writeFileSync } from "fs"
import { PDFDocument } from 'pdf-lib'

const convertCss: { [key: string]: string } = {
	zb_ppt: __dirname + "/../asset/ppt.css",
    zb_ppt_large: __dirname + "/../asset/ppt-large.css",
	zb_doc: __dirname + "/../asset/doc.css",
	zb_official: __dirname + "/../asset/official.css",
}

class Zigzi extends Command {
	static description = "Convert markdown to pdf with zigbang document style"
	file = ""
    converType = ""
	static flags = {
		version: flags.version({ char: "v" }),
		help: flags.help({ char: "h" }),
		template: flags.string({
			char: "t",
			description: "select a document template to convert",
			options: Object.keys(convertCss),
		}),
		output: flags.string({
			char: "o",
			description: "select output type",
			options: ["pdf", "html"],
		}),
        vscode: flags.boolean({
            description: "vscode markdown template setting",
        })
	}

	static args = [
		{
			name: "file",
			description: "Please enter a md file name",
		},
	]

	async run() {
		const { args, flags } = this.parse(Zigzi)
		const output = flags.output ?? "pdf"
		this.file = args.file
        this.converType = flags.template ?? "zb_doc"

        if(flags.vscode) {
            await this.setVSCodeSetting()
        }
        if(args.file) {
            
            if (this.converType.indexOf("ppt") > -1) {
                await this.marp()
            } else {
                await this.toHtml()
                if (output === "pdf") {
					if(flags.template === 'zb_official') {
						await this.toPdfOfficial()
					} else {
						await this.toPdf()
					}
                }
            }
        }
	}

	async marp() {
		const { args, flags } = this.parse(Zigzi)
        let md = fs.readFileSync(this.file, "utf8")
        const cssFile = (md.indexOf("theme: ppt-large") > 0) ? convertCss["zb_ppt_large"] : convertCss["zb_ppt"]

		const pdfFileName = `${this.file.replace(".md", ".pdf")}`
		await child_process.execSync(
			`npx @marp-team/marp-cli@latest --allow-local-files ${this.file} -o ${pdfFileName} --theme ${cssFile}`
		)
	}

	async toHtml() {
		const { flags } = this.parse(Zigzi)
		const cssType = convertCss[this.converType]
		const htmlFileName = `${this.file.replace(".md", ".html")}`

		let md = fs.readFileSync(this.file, "utf8")
		const pageBreak = /<!-- page-break -->/g
		md = md.replace(pageBreak, `<hr class="page-break" />`) 
		md = md.replace(RegExp(/<!--[^>]/g), "")
		md = md.replace(RegExp(/-->/g), "")
        let markedHtml
        if(flags.template === "zb_official") {
            markedHtml = `<header></header> ${marked(md)}<footer></footer>`
        } else {
            markedHtml = marked(md)
        }

		const css = fs.readFileSync(cssType, "utf8")
		const html = `
		<!doctype html>
		<html>
		    <head>
		        <meta charset="utf-8"/>
		        <style>${css}</style>
		    </head>
		    <body><div id="zigbang-zigzi">${markedHtml}</div></body>
		</html>`

		const stream = await fs.createWriteStream(`${htmlFileName}`)
		await stream.once("open", () => {
			stream.write(html)
			stream.end()
		})
	}

	async toPdf() {
        const { flags } = this.parse(Zigzi)

		const htmlFileName = `${this.file.replace(".md", ".html")}`
		const pdfFileName = `${this.file.replace(".md", ".pdf")}`
        const headerFooterTemplate = (flags.template === "zb_doc") ? {
            displayHeaderFooter: true
        }: {}

		const browser = await puppeteer.launch()
        
		const page = await browser.newPage()
        await page.goto(`file://${path.resolve(htmlFileName)}`, 
        {
            waitUntil: "networkidle2",
        });
		await page.emulateMediaType("screen")
		await page.pdf({
			format: "a4",
			path: `${path.resolve(pdfFileName)}`,
			printBackground: true,
            headerTemplate: `<div class="header" style="background:#ffa400; top:0 !important; width:16px; height:884px; margin:-20px 0 0 !important; padding:0 !important;  -webkit-print-color-adjust: exact;"></div>`,
            footerTemplate: `<div class="footer" style="padding: 0 !important; margin: 0 !important; z-index:100 !important; position:relative !important; -webkit-print-color-adjust: exact; width: 100%; text-align: center; color:#000; font-size: 10px; font-family: Arial, sans-serif;"><span class="pageNumber"></span></div>`,
            displayHeaderFooter: flags.template==='zb_doc',
			margin: {
				top: 50,
				bottom: 50,
				left: 58,
				right: 58,
			},
		})

		await browser.close()
		await fs.unlinkSync(`${htmlFileName}`)
	}

	async toPdfOfficial() {
		const htmlFileName = `${this.file.replace(".md", ".html")}`
		const pdfFileName = `${this.file.replace(".md", ".pdf")}`

		const browser = await puppeteer.launch()
        
		const page = await browser.newPage()
        await page.goto(`file://${path.resolve(htmlFileName)}`, 
        {
            waitUntil: "networkidle2",
			timeout: 60000 * 2
        });
		await page.emulateMediaType("screen")

		const headerTemplate = "<div></div>"
		const footerTemplate = 
		'<style>.footer { font-family: "SpoqaHanSans", sans-serif; color: #000; width: calc(100% - 58px - 58px) !important; margin-left: auto; margin-right: auto; margin-bottom: 15px; text-align: center !important; font-size: 20px !important; letter-spacing: 2px !important; line-height: 1.5em !important; font-weight: 700 !important; padding-top: 30px !important; padding-bottom: 30px !important; border-bottom: 1px solid #333 !important;}</style><div class="footer"><span>주 식 회 사&nbsp;&nbsp;직 　 방<br />대 표 이 사&nbsp;&nbsp;안 성 우</span></div>'

		const baseOpt: puppeteer.PDFOptions = {
			format: "a4",
			path: `${path.resolve(pdfFileName)}`,
			headerTemplate,
			footerTemplate,
            displayHeaderFooter: true,
			margin: {
				top: 50,
				bottom: 50,
				left: 58,
				right: 58,
			},
			timeout: 1000 * 60 * 10
		}
		
		await page.pdf(baseOpt)
		const dataBuffer = fs.readFileSync(path.resolve(pdfFileName));
		const pdfInfo = await pdfParse(dataBuffer);
		const numPages = pdfInfo.numpages;
		if(numPages === 1) {
			await page.addStyleTag({path: path.resolve(__dirname, '../asset/official-single-page-footer.css')})
			await page.pdf({ 
				...baseOpt, 
				displayHeaderFooter: false
			})
		} else {
			const restBuffer = await page.pdf({
				...baseOpt,
				displayHeaderFooter: false,
				pageRanges: `-${numPages-1}`
			})
			const lastPdfName = `${pdfFileName}-last.pdf`
			const lastBuffer = await page.pdf({
				...baseOpt,
				displayHeaderFooter: true,
				pageRanges: `${numPages}`,
				path: lastPdfName,
			})
			await fs.unlinkSync(lastPdfName)

			const mergedPdfBuffer = await this.mergePdfBuffers(restBuffer, lastBuffer)

			await fs.writeFileSync(`${path.resolve(pdfFileName)}`, mergedPdfBuffer)
		}
		await browser.close()
		await fs.unlinkSync(`${htmlFileName}`)
	}

	async mergePdfBuffers(target1: Buffer, target2:Buffer) {
		const pdf1 = await PDFDocument.load(target1);
		const pdf2 = await PDFDocument.load(target2);

		const mergedPdf = await PDFDocument.create(); 
		const copiedPagesA = await mergedPdf.copyPages(pdf1, pdf1.getPageIndices());
		copiedPagesA.forEach((page) => mergedPdf.addPage(page)); 
		const copiedPagesB = await mergedPdf.copyPages(pdf2, pdf2.getPageIndices());
		copiedPagesB.forEach((page) => mergedPdf.addPage(page)); 
		return await mergedPdf.save();
	}

    async setVSCodeSetting() {
        const location = shell.exec("pwd")
        const setting_location = process.platform === "win32" ? "%APPDATA%\/Code\/User\/" : "~/Library/Application Support/Code/User/"
JSON.stringify
        shell.cd(setting_location)
        shell.exec("pwd")

        const settingsBuffer = await readFileSync("settings.json", {encoding:"utf8"})
        let settings = settingsBuffer

        const css = `
        "https://zigbang.github.io/zigzi/asset/ppt.css",
        "https://zigbang.github.io/zigzi/asset/presentation.css",
        "https://zigbang.github.io/zigzi/asset/doc.css",
        "https://zigbang.github.io/zigzi/asset/official.css"
        `
        if(settings.indexOf("markdown.marp.themes") === -1) {
            settings = settings.replace(/{/,  `{"markdown.marp.themes": [${css}],`)
        } else {
            const startStr = settings.indexOf('"markdown.marp.themes":')
            
        }
        await writeFileSync("settings.json", settings)
        shell.cd(location)
        shell.exec("pwd")
    }
}

export = Zigzi
