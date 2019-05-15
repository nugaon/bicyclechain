import "reflect-metadata";
import { Engine } from "./Engine";

async function start(): Promise<void> {
    await new Engine().bootstrapApplication(true);
}

start();
