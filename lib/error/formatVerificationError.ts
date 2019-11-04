export class FormatVerificationError extends Error {
    constructor(msg: string) {
        super(`MultiRecapExtension:Format Error:${msg}`);
    }

}