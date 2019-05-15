
/**
 * Executed on graceful shutdown.
 */
export interface OnDestroy {
    onDestroy(): Promise<void>;
}

/**
 * Executed on server start. If this method fails, it will stop startup sequence and the process will shut down.
 */
export interface OnInit {
    onInit(): Promise<void>;
}
