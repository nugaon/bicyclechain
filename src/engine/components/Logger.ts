import * as fs from "fs";
import { injectable } from "inversify";
import { Format, TransformableInfo } from "logform";
import * as path from "path";
import * as winston from "winston";
import * as winstonFile from "winston-daily-rotate-file";

@injectable()
export class Logger {

    private instance: winston.Logger;
    private directory: string;

    constructor() {
        this.init();
    }

    private init(): void {
        this.directory = path.join(__dirname, "../../../logs/");
        if (!fs.existsSync(this.directory)) {
            fs.mkdirSync(this.directory);
        }
        this.instance = winston.createLogger(this.getLoggerConfiguration());
    }

    private getLoggerConfiguration(): winston.LoggerOptions {
        const printfFormat: Format =
            winston.format.printf((info: TransformableInfo) => `${info.timestamp} [${info.level}] ${info.message}`);
        return {
            transports: [
                new (winston.transports.Console)({
                    level: "verbose",
                    handleExceptions: true,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.colorize(),
                        printfFormat
                    )
                }),
                new winston.transports.File({
                    filename: `${this.directory}/application.log`,
                    level: "verbose",
                    handleExceptions: true,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        printfFormat
                    )
                })
            ],
            exceptionHandlers: [
                new winston.transports.File({
                    filename: `${this.directory}/unhandledExceptions.log`
                })
            ],
            exitOnError: false
        };
    }

    public debug(message: string): void {
        this.instance.debug(message);
    }

    public info(message: string): void {
        this.instance.info(message);
    }

    public warn(message: string): void {
        this.instance.warn(message);
    }

    public error(message: string, exception?: string | Error): void {
        this.instance.error(message, exception);
    }

}
