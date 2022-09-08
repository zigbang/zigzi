/** @format */
/// <reference types="node" />
import { Command, flags } from "@oclif/command";
declare class Zigzi extends Command {
    static description: string;
    file: string;
    converType: string;
    static flags: {
        version: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        template: flags.IOptionFlag<string | undefined>;
        output: flags.IOptionFlag<string | undefined>;
        vscode: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static args: {
        name: string;
        description: string;
    }[];
    run(): Promise<void>;
    marp(): Promise<void>;
    toHtml(): Promise<void>;
    toPdf(): Promise<void>;
    toPdfOfficial(): Promise<void>;
    mergePdfBuffers(target1: Buffer, target2: Buffer): Promise<Uint8Array>;
    setVSCodeSetting(): Promise<void>;
}
export = Zigzi;
