export function ErrorConfiguration(): void {
    process.on("uncaughtException", (error: Error) => {
        console.error(`uncaughtException ${error.message}`);
    });

    process.on("unhandledRejection", (reason: any) => {
        console.error(`unhandledRejection ${reason}`);
    });
}
