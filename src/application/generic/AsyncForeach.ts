export async function AsyncForeach<T>(
    elements: T[],
    callback: (element: T) => Promise<void>
): Promise<void> {
    for (const element of elements) {
        await callback(element);
    }
}
